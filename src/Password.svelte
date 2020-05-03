<script>

    let old = '', newPass = ''

    function change(event) {
        fetch('/auth', {method: 'PATCH', headers: {old, new: newPass}}).then(res => {
            if (res.status == 200) {
                alert('Successfully changed')
            } else {
                alert('Incorrect password')
            }
        })
        event.preventDefault()
    }

</script>

<form on:submit={change}>
    <fieldset>
        <table>
            <tr>
                <td>Old:</td>
                <td><input type="password" bind:value={old}></td>
            </tr>
            <tr>
                <td>New:</td>
                <td><input type="password" bind:value={newPass}></td>
            </tr>
        </table>
        <button on:click={change}>Change</button>
    </fieldset>
</form>

<style>
    form {
        width: fit-content;
        margin-top: 20vh;
        margin-left: auto;
        margin-right: auto;
    }
    
    button {
        margin-top: 1em;
    }
</style>
