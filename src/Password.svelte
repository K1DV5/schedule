<script>

    let old = '', newPass = ''

    function change(event) {
        fetch('http://localhost/auth', {method: 'PATCH', headers: {old, new: newPass}}).then(res => {
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
        <div>
            <label>Old password:</label>
            <input type="password" bind:value={old}>
        </div>
        <br>
        <div>
            <label>New password:</label>
            <input type="password" bind:value={newPass}>
        </div>
        <p><button on:click={change}>Change</button></p>
    </fieldset>
</form>

