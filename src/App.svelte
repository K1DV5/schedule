<script>
    import Scheduler from './Scheduler.svelte'
    import Login, {logOut} from './Login.svelte'
    import Browse from './Browse.svelte'
    import Config from './Config.svelte'
    import Table from './Table.svelte'

    let loggedIn = false
    let showPwInput = false  // for home page, before logging in
    let page = 'browse'

    function onIn() {
        page = 'browse'
        loggedIn = true
    }

    function onOut() {
        loggedIn = false
    }

    async function showCurrent() {
        let now = new Date()
        let semester = now.getMonth() > 7 ? '1' : '2'
        let year = now.getFullYear() - (semester == '1' ? 0 : 1)
        let res = await fetch('/get', {method: 'post', credentials: 'include', headers: {year, semester}})
        if (res.status == 200) {
            let data = await res.json()
            return {year, semester, ...data, message: ''}
        }
        throw res.statusText
    }

</script>

<nav class="noprint">
    {#if loggedIn}
        <h1>Scheduler</h1>
        <button on:click={() => page = 'new'}>New</button>
        <button on:click={() => page = 'browse'}>Borwse</button>
        <button on:click={() => page = 'config'}>Configure</button>
        <button on:click={logOut(onOut)}>Log out</button>
    {:else}
        <div id="home-nav">
            <h1>Scheduler</h1>
            <div>
                <button style="display: {showPwInput ? 'none' : 'block'}" on:click={() => showPwInput = true}>Login</button>
                <div style="display: {showPwInput ? 'block' : 'none'}">
                    <Login onIn={onIn}/>
                </div>
            </div>
        </div>
    {/if}
</nav>
{#if loggedIn}
    {#if page === 'new'}
        <Scheduler />
    {:else if page == 'config'}
        <Config />
    {:else}
        <Browse />
    {/if}
{:else}
    {#await showCurrent()}
        loading
    {:then schedule}
        <h3 class="noprint">Schedule for year {schedule.year}/{schedule.year + 1} semester {schedule.semester}</h3>
        <small class="noprint">Updated {new Date(schedule.time * 1000)}</small>
        <Table data={schedule} />
    {:catch}
        <div> No schedule for the current semester. </div>
    {/await}
{/if}

<style>
    :global(h1, h3) {
        font-family: sans-serif
    }

    #home-nav {
        display: flex;
        justify-content: space-between;
        align-items: start;
    }

    :global(button) {
        background: transparent;
        border: 2px solid #888;
        padding: .5em;
    }

    @media print {
        :global(.noprint) {
            display: none
        }
    }
</style>
