<script lang="ts">
    import { Card } from '@repro/shared/components';
</script>

<!-- Correct usage -->
<Card title="Hello World" description="A simple card" />

<!-- BUG: title expects string, not boolean — should be TS2322 -->
<Card title={true} />

<!-- BUG: title expects string, not number — should be TS2322 -->
<Card title={42} description={false} />
