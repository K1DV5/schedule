<script>
    import Input, {getInput} from './Input.svelte'
    import Table from './Table.svelte'

    let schedule = {}, progress = false
    let shown = 'section'
    let saveFor = {year: null, semester: null}

    let schWorker = new Worker('algo.js')
    schWorker.onmessage = event => {
        progress = false
        schedule = event.data
    }

    function generate() {
        progress = true
        let data = getInput()
        saveFor.year = data.year
        saveFor.semester = data.semester
        schWorker.postMessage(getInput())
    }

    function save(event) {
        let saveURL = 'http://localhost/save'
        let init = {method: 'post', headers: saveFor}
        fetch(saveURL, init).then(res => {
            if (res.status == 200) {
                fetch(saveURL, {...init, body: JSON.stringify(schedule)}).then(res => {
                    if (res.status == 200) {alert('Success')}
                    else {alert('Failed')}
                })
            } else if (res.status == 409) {
                if (confirm('Already exists, overwrite?')) {
                    fetch(saveURL, {...init, body: JSON.stringify(schedule)}).then(res => {
                        if (res.status == 200) {alert('Success')}
                        else {alert('Failed')}
                    })
                } else alert('Cancelled')
            }
        })
        event.preventDefault()
    }

</script>

<main>
    <div class="noprint">
        <Input />
        <button on:click={generate}>{progress ? 'Generating...' : 'Generate'}</button>
    </div>
    {#if schedule.success}
        <div class="noprint message">{schedule.message}</div>
        <button on:click={save}>Save</button>
        <div class="noprint tabs">
            <button class="tab{shown == 'section' ? '' : 'NC'}" on:click={() => shown = 'section'}>Sections</button>
            <button class="tab{shown == 'room' ? '' : 'NC'}" on:click={() => shown = 'room'}>Rooms</button>
            <button class="tab{shown == 'subject' ? '' : 'NC'}" on:click={() => shown = 'subject'}>Subject/Teacher</button>
        </div>
        <Table data={schedule.bySection} kind="section" visible={shown == 'section'}/>
        <Table data={schedule.byRoom} kind="room" visible={shown == 'room'}/>
        <Table data={schedule.bySubject} kind="subject" visible={shown == 'subject'}/>
    {:else if schedule.message}
        <div class="message">{schedule.message}</div>
    {/if}
</main>

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
