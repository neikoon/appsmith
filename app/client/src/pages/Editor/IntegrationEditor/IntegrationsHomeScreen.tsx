import React, { useEffect, useRef } from "react";
import { connect } from "react-redux";
import type { InjectedFormProps } from "redux-form";
import { reduxForm } from "redux-form";
import styled from "styled-components";
import type { AppState } from "@appsmith/reducers";
import { API_HOME_SCREEN_FORM } from "@appsmith/constants/forms";
import NewApiScreen from "./NewApi";
import NewQueryScreen from "./NewQuery";
import ActiveDataSources from "./ActiveDataSources";
import MockDataSources from "./MockDataSources";
import AddDatasourceSecurely from "./AddDatasourceSecurely";
import { getDatasources, getMockDatasources } from "selectors/entitiesSelector";
import type { Datasource, MockDatasource } from "entities/Datasource";
import type { TabProp } from "design-system-old";
import { IconSize, Text, TextType } from "design-system-old";
import scrollIntoView from "scroll-into-view-if-needed";
import { INTEGRATION_TABS, INTEGRATION_EDITOR_MODES } from "constants/routes";
import { thinScrollbar } from "constants/DefaultTheme";
import BackButton from "../DataSourceEditor/BackButton";
import UnsupportedPluginDialog from "./UnsupportedPluginDialog";
import { getQueryParams } from "utils/URLUtils";
import { getIsGeneratePageInitiator } from "utils/GenerateCrudUtil";
import { getCurrentApplicationId } from "selectors/editorSelectors";
import { integrationEditorURL } from "RouteBuilder";
import { getCurrentAppWorkspace } from "@appsmith/selectors/workspaceSelectors";

import { hasCreateDatasourcePermission } from "@appsmith/utils/permissionHelpers";
import { Tab, TabPanel, Tabs, TabsList } from "design-system";
import Debugger, {
  ResizerContentContainer,
  ResizerMainContainer,
} from "../DataSourceEditor/Debugger";
import { showDebuggerFlag } from "selectors/debuggerSelectors";
import AnalyticsUtil from "utils/AnalyticsUtil";
import { DatasourceCreateEntryPoints } from "constants/Datasource";

const HeaderFlex = styled.div`
  font-size: 20px;
  display: flex;
  align-items: center;
  color: var(--ads-v2-color-fg-emphasis-plus);
  padding: 0 var(--ads-v2-spaces-7);
`;

const ApiHomePage = styled.div`
  display: flex;
  flex-direction: column;

  padding-top: 20px;
  /* margin-left: 10px; */
  flex: 1;
  overflow: hidden !important;
  .closeBtn {
    position: absolute;
    left: 70%;
  }
  .fontSize16 {
    font-size: 16px;
  }
  .integrations-content-container {
    padding: 0 var(--ads-v2-spaces-7);
  }
  .t--vertical-menu {
    overflow: auto;
  }
`;

const MainTabsContainer = styled.div`
  width: 100%;
  height: 100%;
  padding: 0 var(--ads-v2-spaces-7);
  /* .react-tabs__tab-list {
    margin: 2px;
  } */
`;

const SectionGrid = styled.div<{ isActiveTab?: boolean }>`
  margin-top: 16px;
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 10px 16px;
  flex: 1;
  min-height: 100%;
`;
const NewIntegrationsContainer = styled.div`
  ${thinScrollbar};
  overflow: auto;
  flex: 1;
  & > div {
    margin-bottom: 20px;
  }
`;

type IntegrationsHomeScreenProps = {
  pageId: string;
  selectedTab: string;
  location: {
    search: string;
    pathname: string;
  };
  history: {
    replace: (data: string) => void;
    push: (data: string) => void;
  };
  isCreating: boolean;
  dataSources: Datasource[];
  mockDatasources: MockDatasource[];
  applicationId: string;
  canCreateDatasource?: boolean;
  showDebugger: boolean;
};

type IntegrationsHomeScreenState = {
  page: number;
  activePrimaryMenuId: string;
  activeSecondaryMenuId: number;
  unsupportedPluginDialogVisible: boolean;
};

type Props = IntegrationsHomeScreenProps &
  InjectedFormProps<{ category: string }, IntegrationsHomeScreenProps>;

const PRIMARY_MENU_IDS = {
  ACTIVE: "ACTIVE",
  CREATE_NEW: "CREATE_NEW",
};

const getSecondaryMenuIds = (hasActiveSources = false) => {
  return {
    API: 0 + (hasActiveSources ? 0 : 1),
    DATABASE: 1 + (hasActiveSources ? 0 : 1),
    MOCK_DATABASE: 2 - (hasActiveSources ? 0 : 2),
  };
};

const TERTIARY_MENU_IDS = {
  ACTIVE_CONNECTIONS: 0,
  MOCK_DATABASE: 1,
};

interface MockDataSourcesProps {
  mockDatasources: MockDatasource[];
  active: boolean;
}

function UseMockDatasources({ active, mockDatasources }: MockDataSourcesProps) {
  const useMockRef = useRef<HTMLDivElement>(null);
  const isMounted = useRef(false);
  useEffect(() => {
    if (active && useMockRef.current) {
      isMounted.current &&
        scrollIntoView(useMockRef.current, {
          behavior: "smooth",
          scrollMode: "always",
          block: "start",
          boundary: document.getElementById("new-integrations-wrapper"),
        });
    } else {
      isMounted.current = true;
    }
  }, [active]);
  return (
    <div id="mock-database" ref={useMockRef}>
      <Text type={TextType.H2}>Get started with our sample datasources</Text>
      <MockDataSources mockDatasources={mockDatasources} />
    </div>
  );
}

function CreateNewAPI({
  active,
  history,
  isCreating,
  pageId,
  showUnsupportedPluginDialog,
}: any) {
  const newAPIRef = useRef<HTMLDivElement>(null);
  const isMounted = useRef(false);

  useEffect(() => {
    if (active && newAPIRef.current) {
      isMounted.current &&
        scrollIntoView(newAPIRef.current, {
          behavior: "smooth",
          scrollMode: "always",
          block: "start",
          boundary: document.getElementById("new-integrations-wrapper"),
        });
    } else {
      isMounted.current = true;
    }
  }, [active]);
  return (
    <div id="new-api" ref={newAPIRef}>
      <Text type={TextType.H2}>APIs</Text>
      <NewApiScreen
        history={history}
        isCreating={isCreating}
        location={location}
        pageId={pageId}
        showSaasAPIs={false}
        showUnsupportedPluginDialog={showUnsupportedPluginDialog}
      />
    </div>
  );
}

function CreateNewSaasIntegration({
  active,
  history,
  isCreating,
  pageId,
  showUnsupportedPluginDialog,
}: any) {
  const newSaasAPIRef = useRef<HTMLDivElement>(null);
  const isMounted = useRef(false);

  useEffect(() => {
    if (active && newSaasAPIRef.current) {
      isMounted.current &&
        scrollIntoView(newSaasAPIRef.current, {
          behavior: "smooth",
          scrollMode: "always",
          block: "start",
          boundary: document.getElementById("new-integrations-wrapper"),
        });
    } else {
      isMounted.current = true;
    }
  }, [active]);
  return (
    <div id="new-saas-api" ref={newSaasAPIRef}>
      <Text type={TextType.H2}>Saas Integrations</Text>
      <NewApiScreen
        history={history}
        isCreating={isCreating}
        location={location}
        pageId={pageId}
        showSaasAPIs
        showUnsupportedPluginDialog={showUnsupportedPluginDialog}
      />
    </div>
  );
}

function CreateNewDatasource({
  active,
  history,
  isCreating,
  pageId,
  showUnsupportedPluginDialog,
}: any) {
  const newDatasourceRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (active && newDatasourceRef.current) {
      scrollIntoView(newDatasourceRef.current, {
        behavior: "smooth",
        scrollMode: "always",
        block: "start",
        boundary: document.getElementById("new-integrations-wrapper"),
      });
    }
  }, [active]);
  return (
    <div id="new-datasources" ref={newDatasourceRef}>
      <Text type={TextType.H2}>Databases</Text>
      <NewQueryScreen
        history={history}
        isCreating={isCreating}
        location={location}
        pageId={pageId}
        showUnsupportedPluginDialog={showUnsupportedPluginDialog}
      />
    </div>
  );
}

class IntegrationsHomeScreen extends React.Component<
  Props,
  IntegrationsHomeScreenState
> {
  unsupportedPluginContinueAction: () => void;

  constructor(props: Props) {
    super(props);
    this.unsupportedPluginContinueAction = () => null;
    this.state = {
      page: 1,
      activePrimaryMenuId: PRIMARY_MENU_IDS.CREATE_NEW,
      activeSecondaryMenuId: getSecondaryMenuIds(
        props.mockDatasources.length > 0,
      ).API,
      unsupportedPluginDialogVisible: false,
    };
  }

  syncActivePrimaryMenu = () => {
    // on mount/update if syncing the primary active menu.
    const { selectedTab } = this.props;
    if (
      (selectedTab === INTEGRATION_TABS.NEW &&
        this.state.activePrimaryMenuId !== PRIMARY_MENU_IDS.CREATE_NEW) ||
      (selectedTab === INTEGRATION_TABS.ACTIVE &&
        this.state.activePrimaryMenuId !== PRIMARY_MENU_IDS.ACTIVE)
    ) {
      this.setState({
        activePrimaryMenuId:
          selectedTab === INTEGRATION_TABS.NEW
            ? PRIMARY_MENU_IDS.CREATE_NEW
            : PRIMARY_MENU_IDS.ACTIVE,
      });
    }
  };

  componentDidMount() {
    const { dataSources, history, pageId } = this.props;

    const queryParams = getQueryParams();
    const redirectMode = queryParams.mode;
    const isGeneratePageInitiator = getIsGeneratePageInitiator();
    if (isGeneratePageInitiator) {
      if (redirectMode === INTEGRATION_EDITOR_MODES.AUTO) {
        delete queryParams.mode;
        delete queryParams.from;
        history.replace(
          integrationEditorURL({
            pageId,
            selectedTab: INTEGRATION_TABS.NEW,
            params: queryParams,
          }),
        );
      }
    } else if (
      dataSources.length > 0 &&
      redirectMode === INTEGRATION_EDITOR_MODES.AUTO
    ) {
      // User will be taken to active tab if there are datasources
      history.replace(
        integrationEditorURL({
          pageId,
          selectedTab: INTEGRATION_TABS.ACTIVE,
        }),
      );
    } else if (redirectMode === INTEGRATION_EDITOR_MODES.MOCK) {
      // If there are no datasources -> new user
      history.replace(
        integrationEditorURL({
          pageId,
          selectedTab: INTEGRATION_TABS.NEW,
        }),
      );
      this.onSelectSecondaryMenu(
        getSecondaryMenuIds(dataSources.length > 0).MOCK_DATABASE,
      );
    } else {
      this.syncActivePrimaryMenu();
    }
  }

  componentDidUpdate(prevProps: Props) {
    this.syncActivePrimaryMenu();
    const { dataSources, history, pageId } = this.props;
    if (dataSources.length === 0 && prevProps.dataSources.length > 0) {
      history.replace(
        integrationEditorURL({
          pageId,
          selectedTab: INTEGRATION_TABS.NEW,
        }),
      );
      this.onSelectSecondaryMenu(
        getSecondaryMenuIds(dataSources.length > 0).MOCK_DATABASE,
      );
    }
  }

  onSelectPrimaryMenu = (activePrimaryMenuId: string) => {
    const { dataSources, history, pageId } = this.props;
    if (activePrimaryMenuId === this.state.activePrimaryMenuId) {
      return;
    }
    history.push(
      integrationEditorURL({
        pageId,
        selectedTab:
          activePrimaryMenuId === PRIMARY_MENU_IDS.ACTIVE
            ? INTEGRATION_TABS.ACTIVE
            : INTEGRATION_TABS.NEW,
      }),
    );
    this.setState({
      activeSecondaryMenuId:
        activePrimaryMenuId === PRIMARY_MENU_IDS.ACTIVE
          ? TERTIARY_MENU_IDS.ACTIVE_CONNECTIONS
          : getSecondaryMenuIds(dataSources.length > 0).API,
    });
  };

  onSelectSecondaryMenu = (activeSecondaryMenuId: number) => {
    this.setState({ activeSecondaryMenuId });
  };

  showUnsupportedPluginDialog = (callback: () => void) => {
    this.setState({
      unsupportedPluginDialogVisible: true,
    });
    this.unsupportedPluginContinueAction = callback;
  };

  render() {
    const {
      canCreateDatasource = false,
      dataSources,
      history,
      isCreating,
      location,
      pageId,
      showDebugger,
    } = this.props;
    const { unsupportedPluginDialogVisible } = this.state;
    let currentScreen;
    const { activePrimaryMenuId, activeSecondaryMenuId } = this.state;

    const PRIMARY_MENU: TabProp[] = [
      {
        key: "ACTIVE",
        title: "Active",
        panelComponent: <div />,
      },
      ...(canCreateDatasource
        ? [
            {
              key: "CREATE_NEW",
              title: "Create new",
              panelComponent: <div />,
              icon: "plus",
              iconSize: IconSize.XS,
            },
          ]
        : []),
    ].filter(Boolean);

    const isGeneratePageInitiator = getIsGeneratePageInitiator();
    // Avoid user to switch tabs when in generate page flow by hiding the tabs itself.
    const showTabs = !isGeneratePageInitiator;
    const mockDataSection =
      this.props.mockDatasources.length > 0 ? (
        <UseMockDatasources
          active={
            activeSecondaryMenuId ===
            getSecondaryMenuIds(dataSources.length > 0).MOCK_DATABASE
          }
          mockDatasources={this.props.mockDatasources}
        />
      ) : null;

    if (activePrimaryMenuId === PRIMARY_MENU_IDS.CREATE_NEW) {
      currentScreen = (
        <NewIntegrationsContainer id="new-integrations-wrapper">
          {dataSources.length === 0 && <AddDatasourceSecurely />}
          {dataSources.length === 0 &&
            this.props.mockDatasources.length > 0 &&
            mockDataSection}
          <CreateNewAPI
            active={
              activeSecondaryMenuId ===
              getSecondaryMenuIds(dataSources.length > 0).API
            }
            history={history}
            isCreating={isCreating}
            location={location}
            pageId={pageId}
            showUnsupportedPluginDialog={this.showUnsupportedPluginDialog}
          />
          <CreateNewDatasource
            active={
              activeSecondaryMenuId ===
              getSecondaryMenuIds(dataSources.length > 0).DATABASE
            }
            history={history}
            isCreating={isCreating}
            location={location}
            pageId={pageId}
            showUnsupportedPluginDialog={this.showUnsupportedPluginDialog}
          />
          <CreateNewSaasIntegration
            active={
              activeSecondaryMenuId ===
              getSecondaryMenuIds(dataSources.length > 0).API
            }
            history={history}
            isCreating={isCreating}
            location={location}
            pageId={pageId}
            showUnsupportedPluginDialog={this.showUnsupportedPluginDialog}
          />
          {dataSources.length > 0 &&
            this.props.mockDatasources.length > 0 &&
            mockDataSection}
        </NewIntegrationsContainer>
      );
    } else {
      currentScreen = (
        <ActiveDataSources
          dataSources={dataSources}
          history={this.props.history}
          location={location}
          onCreateNew={() => {
            this.onSelectPrimaryMenu(PRIMARY_MENU_IDS.CREATE_NEW);
            // Event for datasource creation click
            const entryPoint = DatasourceCreateEntryPoints.ACTIVE_DATASOURCE;
            AnalyticsUtil.logEvent("NAVIGATE_TO_CREATE_NEW_DATASOURCE_PAGE", {
              entryPoint,
            });
          }}
          pageId={pageId}
        />
      );
    }
    return (
      <>
        <BackButton />
        <UnsupportedPluginDialog
          isModalOpen={unsupportedPluginDialogVisible}
          onClose={() =>
            this.setState({ unsupportedPluginDialogVisible: false })
          }
          onContinue={this.unsupportedPluginContinueAction}
        />
        <ApiHomePage
          className="t--integrationsHomePage"
          style={{ overflow: "auto" }}
        >
          <HeaderFlex>
            <p className="sectionHeadings">Datasources in your workspace</p>
          </HeaderFlex>
          <SectionGrid
            isActiveTab={
              this.state.activePrimaryMenuId !== PRIMARY_MENU_IDS.ACTIVE
            }
          >
            <MainTabsContainer>
              {showTabs && (
                <Tabs
                  data-testid="t--datasource-tab"
                  onValueChange={this.onSelectPrimaryMenu}
                  value={this.state.activePrimaryMenuId}
                >
                  <TabsList>
                    {PRIMARY_MENU.map((tab: TabProp) => (
                      <Tab
                        data-testid={`t--tab-${tab.key}`}
                        key={tab.key}
                        value={tab.key}
                      >
                        {tab.title}
                      </Tab>
                    ))}
                  </TabsList>
                  {PRIMARY_MENU.map((tab: TabProp) => (
                    <TabPanel key={tab.key} value={tab.key}>
                      {tab.panelComponent}
                    </TabPanel>
                  ))}
                </Tabs>
              )}
            </MainTabsContainer>
            <ResizerMainContainer>
              <ResizerContentContainer className="integrations-content-container">
                {currentScreen}
              </ResizerContentContainer>
              {showDebugger && <Debugger />}
            </ResizerMainContainer>
          </SectionGrid>
        </ApiHomePage>
      </>
    );
  }
}

const mapStateToProps = (state: AppState) => {
  // Debugger render flag
  const showDebugger = showDebuggerFlag(state);

  const userWorkspacePermissions =
    getCurrentAppWorkspace(state).userPermissions ?? [];

  const canCreateDatasource = hasCreateDatasourcePermission(
    userWorkspacePermissions,
  );
  return {
    dataSources: getDatasources(state),
    mockDatasources: getMockDatasources(state),
    isCreating: state.ui.apiPane.isCreating,
    applicationId: getCurrentApplicationId(state),
    canCreateDatasource,
    showDebugger,
  };
};

export default connect(mapStateToProps)(
  reduxForm<{ category: string }, IntegrationsHomeScreenProps>({
    form: API_HOME_SCREEN_FORM,
  })(IntegrationsHomeScreen),
);
