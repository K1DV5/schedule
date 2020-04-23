<script>
    import Input, {getInput} from './Input.svelte'
    import Table, {toTables} from './Table.svelte'

    let schWorker = new Worker('algo.js')
    schWorker.onmessage = event => schedule = toTables(event.data)

    let schedule = {}
    let shown = 'section'

    function changeShown(to) {
        return function() {
            shown = to
        }
    }

    function generate() {
        schedule = {progress: true}
        schWorker.postMessage(getInput())
    }

    function followHash(event) {
        let [tab, hash] = event.newURL.split('#').slice(1)
        if (!['section', 'room', 'subject'].includes(tab)) return
        shown = tab
        if (hash) setTimeout(() => window.location.hash = '#' + hash, 300)
    }

</script>

<main>
    <div class="noprint">
        <Input />
        <button on:click={generate}>{schedule.progress ? 'Generating...' : 'Generate'}</button>
    </div>
    {#if schedule.success}
        <div class="noprint message">{schedule.message}</div>
        <div class="noprint tabs">
            <button class="tab{shown == 'section' ? '' : 'NC'}" on:click={changeShown('section')}>Sections</button>
            <button class="tab{shown == 'room' ? '' : 'NC'}" on:click={changeShown('room')}>Rooms</button>
            <button class="tab{shown == 'subject' ? '' : 'NC'}" on:click={changeShown('subject')}>Subject/Teacher</button>
        </div>
        <Table data={schedule.bySection} visible={shown == 'section'}/>
        <Table data={schedule.byRoom} visible={shown == 'room'}/>
        <Table data={schedule.bySubject} visible={shown == 'subject'}/>
    {:else if schedule.message}
        <div class="message">{schedule.message}</div>
    {/if}
</main>

<svelte:window on:hashchange={followHash} />

<style>
    .tabs {
        background-color: lightgray;
    }

    .tabNC {
        border: none;
    }

    .tab {
        border: none;
        border-bottom: solid darkgrey;
    }

    .message {
        white-space: pre-wrap;
    }

    :global(button) {
        background: transparent;
        border: 2px solid #888;
        padding: .5em;
    }

    :global(select) {
        background: transparent;
        border: 2px solid #888;
    }

    @media print {
        .noprint {
            display: none
        }
    }
</style>
