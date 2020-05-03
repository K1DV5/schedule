<script>
    import Table from './Table.svelte'

    let schedules = []
    let shown = null

    function refresh() {
        fetch('http://localhost/get', {method: 'post'}).then(res => {
            res.json().then(data => {
                for (let [i, schedule] of schedules.entries()) {
                    let key = schedule.year + '-' + schedule.semester
                    if (data.hasOwnProperty(key)) {
                        if (data[key].created !== schedule.created) {
                            schedules[i] = data[key]
                        }
                    } else {
                        schedules.splice(i, 1)
                    }
                    delete data[key]
                }
                for (let [key, schedule] of Object.entries(data)) {
                    let [year, semester] = key.split('-')
                    schedules.push({year: Number(year), semester: Number(semester), ...schedule})
                }
                schedules = schedules.sort((a, b) => a.year < b.year ? -1 : 1)
            })
        })
    }

    function delSch() {
        if (shown === null) return
        fetch('http://localhost', {method: 'delete', headers: {year: shown.year, semester: shown.semester}}).then(res => {
            if (res.status == 200) {
                refresh()
                shown = null
            } else {
                alert(res.statusText)
            }
        })
    }

</script>

{#if shown === null}
    {refresh() || ''}
    <h3 class="noprint">Saved schedules</h3>
    {#each [...schedules.entries()] as [i, schedule]}
        <div on:click={() => shown = {i, ...schedules[i]}} class="item">
            {schedule.year}/{schedule.year + 1} Semester {schedule.semester}
        </div>
    {/each}
{:else}
    <div class="shown" style="display:{shown === null ? 'none' : 'block'}">
        <button class="noprint" on:click={() => shown = null}>Back</button>
        <button class="noprint" on:click={delSch}>Delete</button>
        <Table data={shown} />
    </div>
{/if}

<style>
    .item {
        border: solid grey;
        padding: 1em;
        margin-top: 1em
    }

    .item:hover {
        cursor: pointer
    }

    .shown {
        margin-top: 1em
    }
</style>
