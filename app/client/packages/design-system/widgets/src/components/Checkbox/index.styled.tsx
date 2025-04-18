import styled from "styled-components";
import { Checkbox as HeadlessCheckbox } from "@design-system/headless";

import type { CheckboxProps } from ".";
import { inlineLabelStyles } from "../../styles/inlineLabelStyles";

export const StyledCheckbox = styled(HeadlessCheckbox)<CheckboxProps>`
  ${inlineLabelStyles}

  [data-icon] {
    --checkbox-border-width: var(--border-width-2);
    --checkbox-border-color: var(--color-bd-neutral);
    // Note: we are using box-shadow as the border to avoid the border from
    // changing the size of the checkbox and icon
    --checkbox-box-shadow: 0px 0px 0px var(--checkbox-border-width)
      var(--checkbox-border-color) inset;

    width: var(--sizing-4);
    height: var(--sizing-4);
    box-shadow: var(--checkbox-box-shadow);
    border-radius: clamp(0px, var(--border-radius-1), 6px);
    color: transparent;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    user-select: none;
    flex-shrink: 0;
  }

  &[data-hovered]:not([data-disabled]) [data-icon] {
    --checkbox-border-color: var(--color-bd-neutral-hover);
  }

  /**
 * ----------------------------------------------------------------------------
 * CHECKED  AND INDETERMINATE - BUT NOT DISABLED
 *-----------------------------------------------------------------------------
 */
  &[data-state="checked"] [data-icon],
  &[data-state="indeterminate"] [data-icon] {
    --checkbox-border-color: var(--color-bg-accent);

    background-color: var(--color-bg-accent);
    color: var(--color-fg-on-accent);
  }

  &[data-hovered][data-state="checked"]:not([data-disabled]) [data-icon],
  &[data-hovered][data-state="indeterminate"]:not([data-disabled]) [data-icon] {
    --checkbox-border-color: var(--color-bg-accent-hover);

    background-color: var(--color-bg-accent-hover);
    color: var(--color-fg-on-accent);
  }

  /**
  * ----------------------------------------------------------------------------
  * FOCUS
  *-----------------------------------------------------------------------------
  */
  &[data-focused] [data-icon] {
    box-shadow: var(--checkbox-box-shadow), 0 0 0 2px var(--color-bg),
      0 0 0 4px var(--color-bd-focus);
  }

  /**
 * ----------------------------------------------------------------------------
 * ERROR ( INVALID )
 *-----------------------------------------------------------------------------
 */
  &[data-invalid] [data-icon] {
    --checkbox-border-color: var(--color-bd-negative);
  }

  &[data-hovered][data-invalid] [data-icon] {
    --checkbox-border-color: var(--color-bd-negative-hover);
  }
`;
