<script context="module">

    export function logOut() {
        sessionStorage.removeItem('loggedIn')
    }

</script>
<script>

    export let onSuccess

    let password = '123'
    let pwd = '123'
    let error = false

    if (sessionStorage.getItem('loggedIn') == 'true') onSuccess()

    function login(event) {
        if (password == pwd) {
            sessionStorage.setItem('loggedIn', 'true')
            onSuccess()
        } else {
            error = true
            setTimeout(() => error = false, 1000)
        }
        event.preventDefault()
    }

</script>

<form>
    <fieldset>
        <p>Password</p>
        <input type="password" bind:value={password}>
        {#if error}
            <p class="error">Incorrect password</p>
        {/if}
        <p><button on:click={login}>Login</button></p>
    </fieldset>
</form>

<style>
    form {
        width: fit-content;
        margin: auto;
        margin-top: 40vh;
    }

    .error {
        font-size: small;
        color: red
    }
</style>
