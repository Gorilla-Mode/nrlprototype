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
  }

  let { id, labelledby, options, value = $bindable() }: Props = $props();

  function choose(event: Event & { currentTarget: HTMLSelectElement }) {
    const next = options.find((option) => option.value === event.currentTarget.value);
    if (next) value = next.value;
  }
</script>

<!-- A native select, like Settings: iOS and iPadOS show the system picker. -->
<select class="dropdown" {id} aria-labelledby={labelledby} {value} onchange={choose}>
  {#each options as option (option.value)}
    <option value={option.value} selected={option.value === value}>{option.label}</option>
  {/each}
</select>

<style>
  .dropdown {
    width: 100%;
    min-width: 0;
    min-height: var(--control-height-default);
    border: var(--border-strong);
    border-radius: var(--radius-control);
    padding: var(--space-3);
    background: var(--color-background-raised);
    color: var(--color-text-primary);
    font: inherit;
  }
</style>
