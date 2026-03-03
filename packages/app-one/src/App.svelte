<script lang="ts">
    import { Button } from '@repro/shared/components';
</script>

<!-- Correct usage -->
<Button label="Click me" disabled={false} />

<!-- BUG: label expects string, not number — should be TS2322 -->
<Button label={123} />
