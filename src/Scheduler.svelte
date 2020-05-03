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
        let saveURL = '/save'
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
    <Input />
    <button on:click={generate} class="noprint">{progress ? 'Generating...' : 'Generate'}</button>
    {#if schedule.success}
        <button on:click={save} class="noprint" >Save</button>
        <Table data={schedule} />
    {:else if schedule.message}
        <div class="message">{schedule.message}</div>
    {/if}
</main>

