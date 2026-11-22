const shareButton = document.getElementById('shareArtworkButton');
const copyButton = document.getElementById('copyAgendaButton');
const status = document.getElementById('shareStatus');
const agenda = document.getElementById('agendaLink');

function showStatus(message) {
  status.hidden = false;
  status.textContent = message;
}

async function prepareImageShare() {
  if (!navigator.share || !navigator.canShare) return;
  try {
    const response = await fetch(document.getElementById('shareArtwork').src);
    if (!response.ok) return;
    const image = new File([await response.blob()], 'Yuli-Master-Pokemon.jpg', {type: 'image/jpeg'});
    const data = {files: [image], text: 'PokéWeek · La agenda Pokémon GO de Yuli\n' + agenda.href};
    if (!navigator.canShare(data)) return;
    shareButton.addEventListener('click', async () => {
      try {
        await navigator.share(data);
      } catch (error) {
        if (error.name !== 'AbortError') showStatus('Descarga la imagen y adjúntala desde WhatsApp.');
      }
    });
    shareButton.hidden = false;
  } catch {
    // The download link stays available when native sharing cannot be prepared.
  }
}

if (navigator.clipboard?.writeText) {
  copyButton.hidden = false;
  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(agenda.href);
      showStatus('Enlace copiado.');
    } catch {
      showStatus(agenda.href);
    }
  });
}

prepareImageShare();
