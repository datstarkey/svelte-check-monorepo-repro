<script lang="ts">
    import type { Snippet } from 'svelte';

    let { title, description = '', children }: { title: string; description?: string; children?: Snippet } = $props();
</script>

<div class="card">
    <h2>{title}</h2>
    {#if description}
        <p>{description}</p>
    {/if}
    {#if children}
        {@render children()}
    {/if}
</div>
