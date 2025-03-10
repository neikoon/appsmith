import styled from "styled-components";
import { Radio as HeadlessRadio } from "@design-system/headless";

import type { RadioProps } from ".";
import { inlineLabelStyles } from "../../styles/inlineLabelStyles";

export const StyledRadio = styled(HeadlessRadio)<RadioProps>`
  ${inlineLabelStyles}

  [data-icon] {
    --radio-border-width: var(--border-width-2);
    --radio-border-color: var(--color-bd-neutral);
    // Note: we are using box-shadow as the border to avoid the border from
    // changing the size of the radio and icon
    --radio-box-shadow: 0px 0px 0px var(--radio-border-width)
      var(--radio-border-color) inset;

    width: var(--sizing-4);
    height: var(--sizing-4);
    box-shadow: var(--radio-box-shadow);
    border-radius: 100%;
    color: transparent;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    user-select: none;
    flex-shrink: 0;
  }

  &[data-hovered]:not([data-disabled]) [data-icon] {
    --radio-border-color: var(--color-bd-neutral-hover);
  }

  /**
 * ----------------------------------------------------------------------------
 * CHECKED  AND INDETERMINATE - BUT NOT DISABLED
 *-----------------------------------------------------------------------------
 */
  &[data-state="selected"] [data-icon] {
    --radio-border-color: var(--color-bg-accent);
    --radio-box-shadow: 0px 0px 0px 4px var(--color-bg-accent) inset;

    background: var(--color-fg-on-accent);
  }

  &[data-hovered][data-state="selected"]:not([data-disabled]) [data-icon] {
    --radio-border-color: var(--color-bg-accent-hover);
    --radio-box-shadow: 0px 0px 0px 4px var(--color-bg-accent-hover) inset;

    background: var(--color-fg-on-accent);
  }

  /**
  * ----------------------------------------------------------------------------
  * FOCUS
  *-----------------------------------------------------------------------------
  */
  &[data-focused] [data-icon] {
    box-shadow: var(--radio-box-shadow), 0 0 0 2px var(--color-bg),
      0 0 0 4px var(--color-bd-focus);
  }

  /**
 * ----------------------------------------------------------------------------
 * ERROR ( INVALID )
 *-----------------------------------------------------------------------------
 */
  &[data-invalid] [data-icon] {
    --radio-border-color: var(--color-bd-negative);
  }

  &[data-hovered][data-invalid] [data-icon] {
    --radio-border-color: var(--color-bd-negative-hover);
  }
`;
