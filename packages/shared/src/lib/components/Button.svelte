<script lang="ts">
    let { label, disabled = false }: { label: string; disabled?: boolean } = $props();
</script>

<button {disabled} onclick>{label}</button>
