const widgetsPage = require("../../../../../locators/Widgets.json");
const commonlocators = require("../../../../../locators/commonlocators.json");
const testdata = require("../../../../../fixtures/testdata.json");

import {
  agHelper,
  entityExplorer,
  propPane,
  table,
} from "../../../../../support/Objects/ObjectsCore";

describe("Table Widget V2 property pane feature validation", function () {
  before(() => {
    agHelper.AddDsl("tableV2NewDsl");
  });

  it("1. Table widget V2 with Add button test and validation", function () {
    entityExplorer.SelectEntityByName("Table1", "Widgets");
    // Open column details of "id".
    cy.get(widgetsPage.tableV2Btn).should("not.exist");
    // Changing column data type to "Button"
    table.ChangeColumnType("id", "Button");
    // Changing the computed value (data) to "orderAmount"
    propPane.UpdatePropertyFieldValue("Text", "{{currentRow.orderAmount}}");
    // Selecting button action to show message
    propPane.SelectPlatformFunction("onClick", "Show alert");
    agHelper.EnterActionValue(
      "Message",
      "Successful ".concat(testdata.currentRowEmail),
    );

    agHelper.AssertAutoSave();
    // Validating the button action by clicking
    cy.get(widgetsPage.tableV2Btn).last().click({ force: true });
    // Validating the toast message
    agHelper.WaitUntilToastDisappear("Successful tobias.funke@reqres.in");

    // Open column details of "id".
    propPane.EnterJSContext(
      "onClick",
      "{{showAlert('Successful ' + currentRow.email).then(() => showAlert('second alert')) }}",
    );
    agHelper.Sleep();

    // Validating the button action by clicking
    cy.get(widgetsPage.tableV2Btn).last().click({ force: true });
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    agHelper.AssertContains("Successful tobias.funke@reqres.in");
    agHelper.AssertContains("second alert");
  });

  it("2. Table Button color validation", function () {
    cy.openPropertyPane("tablewidgetv2");
    // Open column details of "id".
    cy.editColumn("id");
    const color1 = "rgb(255, 0, 0)";
    cy.moveToStyleTab();
    cy.get(widgetsPage.buttonColor).click({ force: true }).clear().type(color1);
    cy.get(widgetsPage.tableV2Btn).should(
      "have.css",
      "background-color",
      color1,
    );

    // Changing the color again to reproduce issue #9526
    const color2 = "rgb(255, 255, 0)";
    cy.get(widgetsPage.buttonColor)
      .click({ force: true })
      .clear()
      // following wait is required to reproduce #9526
      .wait(600)
      .type(color2);
    cy.get(widgetsPage.tableV2Btn).should(
      "have.css",
      "background-color",
      color2,
    );
  });

  it("3. Table widget triggeredRow property should be accessible", function () {
    cy.get(commonlocators.TextInside).should("have.text", "Tobias Funke");
  });

  it("4. Table widget triggeredRow property should be same even after sorting the table", function () {
    //sort table date on second column
    cy.get(".draggable-header ").first().click({ force: true });
    cy.wait(1000);
    cy.get(commonlocators.TextInside).should("have.text", "Tobias Funke");
  });

  it("5. Table widget add new icon button column", function () {
    cy.get("[data-testid='t--property-pane-back-btn']").click({ force: true });
    // hide id column
    cy.makeColumnVisible("id");
    cy.wait(1000);
    // click on Add new Column.
    //cy.get("[data-testid='t--property-pane-back-btn']").click({ force: true });
    cy.get(".t--add-column-btn").click();
    //Open New Custom Column
    cy.editColumn("customColumn1");
    // Change Column type to icon Button
    cy.changeColumnType("Icon button");
    // Select Icon from Icon Control
    cy.get(".t--property-control-icon .bp3-icon-caret-down").click({
      force: true,
    });
    cy.get(".bp3-icon-add").first().click({
      force: true,
    });
    cy.get(".t--widget-tablewidgetv2 .tbody .bp3-icon-add").should("exist");

    // disabled icon btn
    cy.CheckWidgetProperties(commonlocators.disableCheckbox);
    cy.getTableV2DataSelector("0", "4").then((selector) => {
      cy.get(selector + " button.bp3-disabled").should("exist");
    });
    cy.UncheckWidgetProperties(commonlocators.disableCheckbox);

    //Delete Column
    cy.get("[data-testid='t--property-pane-back-btn']").click({
      force: true,
    });
    cy.deleteColumn("customColumn1");
  });

  it("6. Table widget add new menu button column", function () {
    cy.openPropertyPane("tablewidgetv2");
    // click on Add new Column.
    cy.get(".t--add-column-btn").click();
    //Open New Custom Column
    cy.editColumn("customColumn1");
    // Change Column type to icon Button
    cy.changeColumnType("Menu button");
    //Changing the text on the Menu button
    cy.testJsontext("text", "Menu button");
    cy.moveToStyleTab();
    // Select Icon from Icon Control
    cy.get(".t--property-control-icon .bp3-icon-caret-down").click({
      force: true,
    });
    cy.get(".bp3-icon-add").first().click({
      force: true,
    });
    // validate icon
    cy.get(".t--widget-tablewidgetv2 .tbody .bp3-icon-add").should("exist");
    cy.get(".editable-text-container").eq(1).click();
    // validate label
    cy.contains("Menu button").should("exist");

    // const color1 = "rgb(255, 255, 0)";
    // cy.get(widgetsPage.menuColor)
    //   .clear()
    //   .click({ force: true })
    //   .type(color1);
    // cy.get(widgetsPage.tableV2Btn).should("have.css", "background-color", color1);

    // // Changing the color again to reproduce issue #9526
    // const color2 = "rgb(255, 0, 0)";
    // cy.get(widgetsPage.menuColor)
    //   .clear()
    //   .click({ force: true })
    //   // following wait is required to reproduce #9526
    //   .wait(5000)
    //   .type(color2);
    // cy.get(widgetsPage.tableV2Btn).should("have.css", "background-color", color2);

    cy.moveToContentTab();
    // Add a Menu item 1
    cy.get(".t--add-menu-item-btn").click({
      force: true,
    });
    // Edit a Menu item
    cy.get(".t--property-control-menuitems .t--edit-column-btn").first().click({
      force: true,
    });
    cy.moveToStyleTab();
    // update menu item background color
    cy.get(widgetsPage.backgroundcolorPickerNew)
      .type("#03b365", {
        force: true,
      })
      .wait(500);
    cy.moveToContentTab();
    //  Add action to the menu Item
    cy.getAlert("onClick", "Successful ".concat(testdata.currentRowEmail));
    // Go back to table property pane
    cy.get("[data-testid='t--property-pane-back-btn']").click({ force: true });
    // Add a Menu item 2
    cy.get(".t--add-menu-item-btn").click({
      force: true,
    });
    // Edit a Menu item
    cy.get(".t--property-control-menuitems .t--edit-column-btn").last().click({
      force: true,
    });
    cy.wait(500);
    cy.moveToStyleTab();
    // update menu item background color
    cy.get(widgetsPage.backgroundcolorPickerNew)
      .clear()
      .type("#FFC13D", {
        force: true,
      })
      .wait(500);
    // Go back to table property pane
    cy.get("[data-testid='t--property-pane-back-btn']").click({ force: true });

    // Add a Menu item 3
    cy.get(".t--add-menu-item-btn").click({
      force: true,
    });
    // Edit a Menu item
    cy.get(".t--property-control-menuitems .t--edit-column-btn").last().click({
      force: true,
    });
    cy.wait(500);
    cy.moveToStyleTab();
    // update menu item background color
    cy.get(widgetsPage.backgroundcolorPickerNew)
      .clear()
      .type("#3366FF", {
        force: true,
      })
      .wait(500);
    // Go back to table property pane
    cy.get("[data-testid='t--property-pane-back-btn']").click({ force: true });

    // Close Property pane
    cy.openPropertyPane("tablewidgetv2");
    // Click on the Menu button
    cy.contains("Menu button").click({
      force: true,
    });
    cy.wait(1000);

    cy.closePropertyPane();

    // Edit a Menu item
    cy.get(".t--property-control-menuitems .t--edit-column-btn").last().click({
      force: true,
    });
    cy.wait(1000);
    cy.moveToContentTab();
    cy.wait(500);
    cy.get(".t--property-control-disabled input").click({
      force: true,
    });
    //cy.closePropertyPane();

    // Click on the Menu button
    cy.get(".t--widget-tablewidgetv2 .bp3-button")
      .first()
      .scrollIntoView()
      .should("be.visible");
    cy.get(".t--widget-tablewidgetv2 .bp3-button").first().click({
      force: true,
    });
    cy.wait(2000);
    // check Menu Item 3 is disable
    cy.get(".bp3-menu-item")
      .eq(2)
      .should("have.css", "background-color", "rgb(250, 250, 250)");
    cy.get(".bp3-menu-item").eq(2).should("have.class", "bp3-disabled");

    // Click on the Menu Item
    cy.get(".bp3-menu-item").eq(0).click({
      force: true,
    });
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(3000);
    // Validating the toast message
    cy.get(widgetsPage.toastAction).should("be.visible");
    cy.get(widgetsPage.toastActionText)
      .last()
      .invoke("text")
      .then((text) => {
        const someText = text;
        expect(someText).to.equal("Successful tobias.funke@reqres.in");
      });
  });

  it("7. Table widget test on button icon click, row should not get deselected", () => {
    cy.get(widgetsPage.tableV2IconBtn).last().click({ force: true });
    cy.get(commonlocators.TextInside).should("have.text", "Tobias Funke");
    //click icon button again
    cy.get(widgetsPage.tableV2IconBtn).last().click({ force: true });
    cy.get(commonlocators.TextInside).should("have.text", "Tobias Funke");
    cy.get("[data-testid='t--property-pane-back-btn']").click({ force: true });
    cy.wait(500);
    cy.get("[data-testid='t--property-pane-back-btn']").click({ force: true });
  });
});
