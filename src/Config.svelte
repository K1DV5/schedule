<script>
    let curriculum
    let oldPass = '', newPass = ''

    function changePass(event) {
        fetch('/auth', {method: 'PATCH', headers: {old: oldPass, new: newPass}}).then(res => {
            if (res.status == 200) {
                alert('Successfully changed')
            } else {
                alert('Incorrect password')
            }
        })
        event.preventDefault()
    }


    function changeCurric(event) {
        event.preventDefault()
        let file = curriculum.files[0]
        file.arrayBuffer().then(buf => {
            fetch('http://localhost/curriculum', {method: 'POST', body: buf}).then(res => alert(res.statusText))
        })
    }

</script>

<form>
    <fieldset>
        <legend>Curriculum data</legend>
        <p>This is a list of subjects with their respective years, semesters, streams, codes, titles, ECTSes and labels (used to specify types of rooms.)</p>
        <p><a href="subjects.xlsx">Download</a> The last data, edit it and upload it.</p>
        <input type="file" bind:this={curriculum}>
        <p><button on:click={changeCurric}>Upload</button></p>
    </fieldset>
    <fieldset>
        <legend>Password</legend>
        <table>
            <tr>
                <td>Old:</td>
                <td><input type="password" bind:value={oldPass}></td>
            </tr>
            <tr>
                <td>New:</td>
                <td><input type="password" bind:value={newPass}></td>
            </tr>
        </table>
        <button on:click={changePass}>Change</button>
    </fieldset>
</form>

<style>

    input, button {
        background: transparent
    }

    img {
        max-width: 100%;
        display: block;
        /* margin-left: auto; */
        /* margin-right: auto */
    }

</style>
