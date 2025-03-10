import {
  agHelper,
  jsEditor,
  propPane,
  deployMode,
  apiPage,
  entityItems,
  entityExplorer,
  locators,
} from "../../../../support/Objects/ObjectsCore";

describe("Validate API request body panel", () => {
  beforeEach(() => {
    agHelper.RestoreLocalStorageCache();
  });

  afterEach(() => {
    agHelper.SaveLocalStorageCache();
  });

  it("1. Check whether input and type dropdown selector exist when multi-part is selected", () => {
    apiPage.CreateApi("FirstAPI", "POST");
    apiPage.SelectPaneTab("Body");
    apiPage.SelectSubTab("FORM_URLENCODED");
    agHelper.AssertElementVisibility(apiPage._bodyKey(0));
    agHelper.AssertElementVisibility(apiPage._bodyValue(0));
    apiPage.SelectSubTab("MULTIPART_FORM_DATA");
    agHelper.AssertElementVisibility(apiPage._bodyKey(0));
    agHelper.AssertElementVisibility(apiPage._bodyTypeDropdown);
    agHelper.AssertElementVisibility(apiPage._bodyValue(0));
    agHelper.ActionContextMenuWithInPane({
      action: "Delete",
      entityType: entityItems.Api,
    });
  });

  it("2. Checks whether No body error message is shown when None API body content type is selected", function () {
    apiPage.CreateApi("FirstAPI", "GET");
    apiPage.SelectPaneTab("Body");
    apiPage.SelectSubTab("NONE");
    cy.get(apiPage._noBodyMessageDiv).contains(apiPage._noBodyMessage);
    agHelper.ActionContextMenuWithInPane({
      action: "Delete",
      entityType: entityItems.Api,
    });
  });

  it("3. Checks whether header content type is being changed when FORM_URLENCODED API body content type is selected", function () {
    apiPage.CreateApi("FirstAPI", "POST");
    apiPage.SelectPaneTab("Body");
    apiPage.SelectSubTab("JSON");
    apiPage.ValidateImportedHeaderParams(true, {
      key: "content-type",
      value: "application/json",
    });
    apiPage.SelectPaneTab("Body");
    apiPage.SelectSubTab("FORM_URLENCODED");
    apiPage.ValidateImportedHeaderParams(true, {
      key: "content-type",
      value: "application/x-www-form-urlencoded",
    });
    agHelper.ActionContextMenuWithInPane({
      action: "Delete",
      entityType: entityItems.Api,
    });
  });

  it("4. Checks whether header content type is being changed when MULTIPART_FORM_DATA API body content type is selected", function () {
    apiPage.CreateApi("FirstAPI", "POST");
    apiPage.SelectPaneTab("Body");
    apiPage.SelectSubTab("JSON");
    apiPage.ValidateImportedHeaderParams(true, {
      key: "content-type",
      value: "application/json",
    });
    apiPage.SelectPaneTab("Body");
    apiPage.SelectSubTab("MULTIPART_FORM_DATA");
    apiPage.ValidateImportedHeaderParams(true, {
      key: "content-type",
      value: "multipart/form-data",
    });
    agHelper.ActionContextMenuWithInPane({
      action: "Delete",
      entityType: entityItems.Api,
    });
  });

  it("5. Checks whether content type 'FORM_URLENCODED' is preserved when user selects None API body content type", function () {
    apiPage.CreateApi("FirstAPI", "POST");
    apiPage.SelectPaneTab("Body");
    apiPage.SelectSubTab("FORM_URLENCODED");
    apiPage.SelectSubTab("NONE");
    apiPage.ValidateImportedHeaderParamsAbsence(true);
    agHelper.ActionContextMenuWithInPane({
      action: "Delete",
      entityType: entityItems.Api,
    });
  });

  it("6. Checks whether content type 'MULTIPART_FORM_DATA' is preserved when user selects None API body content type", function () {
    apiPage.CreateApi("FirstAPI", "POST");
    apiPage.SelectPaneTab("Body");
    apiPage.SelectSubTab("MULTIPART_FORM_DATA");
    apiPage.SelectSubTab("NONE");
    apiPage.ValidateImportedHeaderParamsAbsence(true);
    agHelper.ActionContextMenuWithInPane({
      action: "Delete",
      entityType: entityItems.Api,
    });
  });

  it("7. Checks MultiPart form data for a File Type upload + Bug 12476", () => {
    const imageNameToUpload = "ConcreteHouse.jpg";
    agHelper.AddDsl("multiPartFormDataDsl");

    apiPage.CreateAndFillApi(
      "https://api.cloudinary.com/v1_1/appsmithautomationcloud/image/upload?upload_preset=fbbhg4xu",
      "CloudinaryUploadApi",
      30000,
      "POST",
    );
    apiPage.EnterBodyFormData(
      "MULTIPART_FORM_DATA",
      "file",
      "{{FilePicker1.files[0]}}",
      "File",
    );

    jsEditor.CreateJSObject(
      `export default {
            myVar1: [],
            myVar2: {},
            upload: async () => {
                await CloudinaryUploadApi.run().then(()=> showAlert('Image uploaded to Cloudinary successfully', 'success')).catch(err => showAlert(err.message, 'error'));
                await resetWidget('FilePicker1', true);
            }
        }`,
      {
        paste: true,
        completeReplace: true,
        toRun: false,
        shouldCreateNewJSObj: true,
      },
    );

    entityExplorer.SelectEntityByName("FilePicker1", "Widgets");
    propPane.EnterJSContext("onFilesSelected", `{{JSObject1.upload()}}`);

    entityExplorer.SelectEntityByName("Image1");
    propPane.UpdatePropertyFieldValue(
      "Image",
      "{{CloudinaryUploadApi.data.url}}",
    );

    entityExplorer.SelectEntityByName("CloudinaryUploadApi", "Queries/JS");

    apiPage.ToggleOnPageLoadRun(false); //Bug 12476
    entityExplorer.SelectEntityByName("Page1");
    deployMode.DeployApp(locators._spanButton("Select Files"));
    agHelper.ClickButton("Select Files");
    agHelper.UploadFile(imageNameToUpload);
    agHelper.AssertNetworkExecutionSuccess("@postExecute"); //validating Cloudinary api call
    agHelper.ValidateToastMessage("Image uploaded to Cloudinary successfully");
    agHelper.Sleep();
    cy.xpath(apiPage._imageSrc)
      .find("img")
      .invoke("attr", "src")
      .then(($src) => {
        expect($src).not.eq("https://assets.appsmith.com/widgets/default.png");
      });
    agHelper.AssertElementVisibility(locators._spanButton("Select Files")); //verifying if reset!
    deployMode.NavigateBacktoEditor();
  });

  it("8. Checks MultiPart form data for a Array Type upload results in API error", () => {
    const imageNameToUpload = "AAAFlowerVase.jpeg";
    entityExplorer.SelectEntityByName("CloudinaryUploadApi", "Queries/JS");
    apiPage.EnterBodyFormData(
      "MULTIPART_FORM_DATA",
      "file",
      "{{FilePicker1.files[0]}}",
      "Array",
      true,
    );
    entityExplorer.SelectEntityByName("FilePicker1", "Widgets");
    agHelper.ClickButton("Select Files");
    agHelper.UploadFile(imageNameToUpload);
    agHelper.AssertNetworkExecutionSuccess("@postExecute", false);

    deployMode.DeployApp(locators._spanButton("Select Files"));
    agHelper.ClickButton("Select Files");
    agHelper.UploadFile(imageNameToUpload);
    agHelper.AssertNetworkExecutionSuccess("@postExecute", false);
    agHelper.ValidateToastMessage("CloudinaryUploadApi failed to execute");
    agHelper.AssertElementVisibility(locators._spanButton("Select Files")); //verifying if reset in case of failure!
  });
});
