function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'download';
  const clickHandler = () => {
    setTimeout(() => {
      URL.revokeObjectURL(url);
      removeEventListener('click', clickHandler);
    }, 150);
  };
  a.addEventListener('click', clickHandler, false);
  a.click();
  a.remove();
}

function toJsonBlob(data, spaces = 0) {
  return new Blob(
    [JSON.stringify(data, null, spaces)],
    {type: 'application/json'}
  );
}

const blob = toJsonBlob(localStorage, 2);

downloadBlob(blob, 'timetracker_data.json');
