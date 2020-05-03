<script context="module">

    let authServer = '/auth'
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

    let password = ''
    let check = true

    fetch(authServer, {method: 'POST', credentials: 'include'}).then(res => { if (res.status == 200) onIn() })
    /* onIn() */

    function login(event) {
        check = 'ing'
        fetch(authServer, {method: 'POST', headers: {pass: password}}).then(res => {
            if (res.status == 200) {
                onIn()
                check = true
            } else {
                check = false
                setTimeout(() => check = true, 2000)
            }
        })
        event.preventDefault()
    }

</script>

<form on:submit={login}>
    <fieldset>
        <p>Password</p>
        <input type="password" bind:value={password}>
        {#if check == 'ing'}
            <small>Checking...</small>
        {:else if !check}
            <small class="error">Incorrect password</small>
        {/if}
        <p><button on:click={login}>Login</button></p>
    </fieldset>
</form>

<style>
    form {
        width: fit-content;
        margin: auto;
        margin-top: 20vh;
    }

    .error {
        color: red
    }

    small {
        display: block
    }
</style>
