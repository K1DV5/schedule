<script>
    let data

    function get(event) {
        event.preventDefault()
        let file = data.files[0]
        file.arrayBuffer().then(buf => {
            fetch('http://localhost/curriculum', {method: 'POST', body: buf}).then(res => alert(res.statusText))
        })
    }
</script>

<form>
    <fieldset>
        <p>Excel file</p>
        <input type="file" bind:this={data}>
        <p><button on:click={get}>Upload</button></p>
    </fieldset>
</form>
<img src="curric-format.png" alt="Curriculum format">

<style>
    form {
        width: fit-content;
        margin: auto;
        margin-top: 20vh;
    }

    input, button {
        background: transparent
    }

    img {
        width: 15cm;
        display: block;
        margin-left: auto;
        margin-right: auto
    }

</style>
