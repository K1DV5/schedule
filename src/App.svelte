<script>
    import Sections from './Sections.svelte'
    import Rooms from './Rooms.svelte'
    import makeSchedule from './algo'

    let periods = ['08:00-08:40 am', '08:50-09:30 am', '09:40-10:20 am', '10:30-11:10 am', '11:20-12:00 am', '01:30-02:10 pm', '02:20-03:00 pm', '03:10-03:50 pm', '04:00-01:40 pm', '04:50-05:30 pm']

    let schedule = {}
    let sectionSchShown = true
    let buttonText = 'Rooms'

    function toggleShown() {
        if (sectionSchShown) {
            sectionSchShown = false
            buttonText = 'Sections'
        } else {
            sectionSchShown = true
            buttonText = 'Rooms'
        }
    }

    async function refresh() {
        let text = await (await fetch('/subjects.txt')).text()
        for (let i = 0; i < 10; i++) {
            try {
                schedule = makeSchedule(text)
            } catch {}
        }
    }

</script>

<main>
    <button on:click={refresh}>refresh</button>
    {#await refresh()}
        <div>loading...</div>
    {:then}
        <button on:click={toggleShown}>{buttonText}</button>
        {#if sectionSchShown}
            <Sections data={schedule.by_section} periods={periods}/>
        {:else}
            <Rooms data={schedule.by_room} periods={periods}/>
        {/if}
    {:catch error}
        <p>{error.toString()}</p>
    {/await}
</main>
