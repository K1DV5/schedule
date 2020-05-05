<script>
    import Scheduler from './Scheduler.svelte'
    import Login, {logOut} from './Login.svelte'
    import Browse from './Browse.svelte'
    import Config from './Config.svelte'

    let loggedIn = false
    let page = 'browse'

    function onIn() {
        page = 'browse'
        loggedIn = true
    }

    function onOut() {
        loggedIn = false
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
        <h1 class="splash">Scheduler</h1>
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
    <Login onIn={onIn}/>
{/if}

<style>
    :global(h1, h3) {
        font-family: sans-serif
    }
    .splash {
        width: fit-content;
        margin-left: auto;
        margin-right: auto;
        margin-top: 10vh
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
