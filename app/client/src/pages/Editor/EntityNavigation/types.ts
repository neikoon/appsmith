import type { PropertyPaneConfig } from "constants/PropertyControlConstants";
import type { ENTITY_TYPE } from "entities/AppsmithConsole";

export interface EntityInfo {
  entityType: ENTITY_TYPE;
  id: string;
  // The propertyPath to a control field
  propertyPath?: string;
}

export interface PropertyPaneNavigationConfig {
  sectionId?: string;
  panelStack: IPanelStack[];
  tabIndex: number;
}

export interface IPanelStack {
  index: number;
  path: string;
  panelLabel?: string;
  styleChildren?: PropertyPaneConfig[];
  contentChildren?: PropertyPaneConfig[];
}

export interface IMatchedSection {
  id?: string;
  propertyName: string;
}

export interface IApiPaneNavigationConfig {
  tabIndex?: number;
}
