<script>
    import Input, {getInput} from './Input.svelte'
    import Table, {toTables} from './Table.svelte'

    let subjectsList // the curriculum
    fetch('/subjects.txt').then(file => file.text()).then(content => subjectsList = content)

    let schWorker = new Worker('algo.js')
    schWorker.onmessage = event => {
        /* console.log(event.data) */
        schedule = toTables(event.data)
    }

    let schedule = {}
    let shown = 'section'

    function changeShown(to) {
        return function() {
            shown = to
        }
    }

    function generate() {
        let data = {...getInput(), subjects: subjectsList}
        schedule = {progress: true}
        schWorker.postMessage(data)
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
        <Input/>
        <button on:click={generate}>Generate</button>
    </div>
    {#if schedule.progress}
        <div class="noprint">Loading...</div>
    {:else if schedule.success}
        <div class="noprint">{schedule.message}</div>
        <div class="noprint">
            <button class="tab{shown == 'section' ? '' : 'NC'}" on:click={changeShown('section')}>Sections</button>
            <button class="tab{shown == 'room' ? '' : 'NC'}" on:click={changeShown('room')}>Rooms</button>
            <button class="tab{shown == 'subject' ? '' : 'NC'}" on:click={changeShown('subject')}>Subject/Teacher</button>
        </div>
        <Table data={schedule.bySection} visible={shown == 'section'}/>
        <Table data={schedule.byRoom} visible={shown == 'room'}/>
        <Table data={schedule.bySubject} visible={shown == 'subject'}/>
    {:else if schedule.message}
        <div>{schedule.message}</div>
    {/if}
</main>

<svelte:window on:hashchange={followHash} />

<style>
    .tabNC {
        border: none;
        border-bottom: 2px solid #888;
    }

    .tab {
        border-bottom: none;
        margin-left: -5px
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
