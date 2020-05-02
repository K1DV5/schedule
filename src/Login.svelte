<script context="module">

    let authServer = 'http://localhost/auth'
    /* let authServer = '/auth' */

    export function logOut(onOut) {
        return function() {
            fetch(authServer, {method: 'DELETE', credentials: 'include'})
            onOut()
        }
    }

</script>
<script>

    export let onIn

    let password = '123'
    let error = false

    /* fetch(authServer, {method: 'POST', credentials: 'include'}).then(res => { if (res.status == 200) onIn() }) */
    onIn()

    function login(event) {
        fetch(authServer, {method: 'POST', headers: {pass: password}}).then(res => {
            if (res.status == 200) onIn()
            else {
                error = true
                setTimeout(() => error = false, 1000)
            }
        })
        event.preventDefault()
    }

</script>

<form on:submit={login}>
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
