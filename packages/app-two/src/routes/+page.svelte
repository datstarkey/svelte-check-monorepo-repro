<script lang="ts">
	import { Card } from '@repro/shared/components';
</script>

<h1>App Two</h1>

<!-- Correct usage -->
<Card title="Hello World" description="A simple card" />

<!-- BUG: title expects string, not boolean — should be TS2322 -->
<Card title={true} />

<!-- BUG: title expects string, not number; description expects string, not boolean -->
<Card title={42} description={false} />
