import { IconNames } from "@blueprintjs/icons";
import { ButtonVariantTypes } from "components/constants";
import { ICON_BUTTON_MIN_WIDTH } from "constants/minWidthConstants";
import { ResponsiveBehavior } from "utils/autoLayout/constants";
import IconSVG from "./icon.svg";
import Widget from "./widget";
import { WIDGET_TAGS } from "constants/WidgetConstants";

export const CONFIG = {
  type: Widget.getWidgetType(),
  name: "Icon button",
  iconSVG: IconSVG,
  tags: [WIDGET_TAGS.BUTTONS],
  searchTags: ["click", "submit"],
  defaults: {
    iconName: IconNames.PLUS,
    buttonVariant: ButtonVariantTypes.PRIMARY,
    isDisabled: false,
    isVisible: true,
    rows: 4,
    columns: 4,
    widgetName: "IconButton",
    version: 1,
    animateLoading: true,
    responsiveBehavior: ResponsiveBehavior.Hug,
    minWidth: ICON_BUTTON_MIN_WIDTH,
  },
  properties: {
    derived: Widget.getDerivedPropertiesMap(),
    default: Widget.getDefaultPropertiesMap(),
    meta: Widget.getMetaPropertiesMap(),
    config: Widget.getPropertyPaneConfig(),
    contentConfig: Widget.getPropertyPaneContentConfig(),
    styleConfig: Widget.getPropertyPaneStyleConfig(),
    stylesheetConfig: Widget.getStylesheetConfig(),
    autocompleteDefinitions: Widget.getAutocompleteDefinitions(),
    setterConfig: Widget.getSetterConfig(),
  },
  autoLayout: {
    defaults: {
      rows: 4,
      columns: 2.21,
    },
    autoDimension: {
      width: true,
    },
    widgetSize: [
      {
        viewportMinWidth: 0,
        configuration: () => {
          return {
            minWidth: "40px",
            minHeight: "40px",
          };
        },
      },
    ],
    disableResizeHandles: {
      horizontal: true,
      vertical: true,
    },
  },
};

export default Widget;
