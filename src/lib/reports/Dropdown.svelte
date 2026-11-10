<script lang="ts" generics="T extends string">
  interface Option {
    value: T;
    label: string;
  }

  interface Props {
    /** Id of the native select. */
    id: string;
    /** Id of the visible label that names the field. */
    labelledby: string;
    options: readonly Option[];
    value: T;
    /** Shown, not choosable, while the value is none of the options (e.g. not answered yet). */
    placeholder?: string;
    /** Id of help text that describes the field. */
    describedby?: string;
    /** A required value is missing: red frame and aria-invalid. */
    invalid?: boolean;
  }

  let { id, labelledby, options, value = $bindable(), placeholder, describedby, invalid = false }: Props = $props();
  let unset = $derived(!options.some((option) => option.value === value));

  function choose(event: Event & { currentTarget: HTMLSelectElement }) {
    const next = options.find((option) => option.value === event.currentTarget.value);
    if (next) value = next.value;
  }
</script>

<!-- A native select, like Settings: iOS and iPadOS show the system picker. The arrow is our own. -->
<div class="dropdown-wrap">
  <select class="dropdown" class:invalid class:unset={placeholder && unset} {id} aria-labelledby={labelledby} aria-describedby={describedby} aria-invalid={invalid || undefined} {value} onchange={choose}>
    {#if placeholder}<option value="" disabled hidden selected={unset}>{placeholder}</option>{/if}
    {#each options as option (option.value)}
      <option value={option.value} selected={option.value === value}>{option.label}</option>
    {/each}
  </select>
  <svg class="dropdown-chevron" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
</div>

<style>
  .dropdown-wrap { position: relative; width: 100%; min-width: 0; }
  /* Room on the right for the arrow, so the text never runs under it. */
  .dropdown {
    appearance: none;
    -webkit-appearance: none;
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
    height: var(--control-height-default);
    border: var(--border-strong);
    border-radius: var(--radius-control);
    padding: 0 calc(var(--space-3) + var(--icon-size-default) + var(--space-2)) 0 var(--space-3);
    background: var(--color-background-raised);
    color: var(--color-text-primary);
    font: inherit;
    font-size: var(--font-size-body);
    font-weight: var(--font-weight-regular);
    text-overflow: ellipsis;
    cursor: pointer;
  }
  .dropdown.invalid { border-color: var(--color-status-error); }
  /* The placeholder reads like an input's placeholder: secondary text, at least 4.5:1. */
  .dropdown.unset { color: var(--color-text-secondary); }
  .dropdown.unset option { color: var(--color-text-primary); }
  /* --space-3 inside the frame, like the unit in the height field, so they line up. */
  .dropdown-chevron {
    position: absolute;
    top: 50%;
    right: calc(var(--space-3) + var(--border-width-default));
    width: var(--icon-size-default);
    height: var(--icon-size-default);
    transform: translateY(-50%);
    pointer-events: none;
    color: var(--color-text-secondary);
    stroke: currentColor;
    stroke-width: var(--icon-stroke-width);
    stroke-linecap: round;
    stroke-linejoin: round;
  }
</style>
