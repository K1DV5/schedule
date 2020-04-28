<script>
    import Scheduler from './Scheduler.svelte'
    import Login, {logOut} from './Login.svelte'

    let loggedIn = false

    function onSuccess() {
        loggedIn = true
    }

</script>

<nav>
    {#if loggedIn}
        <h1>Scheduler</h1>
        <button on:click={logOut}>Log out</button>
    {/if}
</nav>
{#if loggedIn}
    <Scheduler />
{:else}
    <Login onSuccess={onSuccess}/>
{/if}
