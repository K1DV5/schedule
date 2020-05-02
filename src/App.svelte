<script>
    import Scheduler from './Scheduler.svelte'
    import Login, {logOut} from './Login.svelte'
    import Browse from './Browse.svelte'
    import Password from './Password.svelte'

    let loggedIn = false
    let page = 'browse'

    function onIn() {
        loggedIn = true
    }

    function onOut() {
        loggedIn = false
    }

</script>

<nav>
    {#if loggedIn}
        <h1>Scheduler</h1>
        <button on:click={() => page = 'new'}>New</button>
        <button on:click={() => page = 'browse'}>Borwse</button>
        <button on:click={() => page = 'password'}>Change password</button>
        <button on:click={logOut(onOut)}>Log out</button>
    {/if}
</nav>
{#if loggedIn}
    {#if page === 'new'}
        <Scheduler />
    {:else if page == 'password'}
        <Password />
    {:else}
        <Browse />
    {/if}
{:else}
    <Login onIn={onIn}/>
{/if}
