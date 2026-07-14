const voteLimit = 3;
const storageKey = 'family-sites-showcase-votes';

function readVotes() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveVotes(votes) {
  localStorage.setItem(storageKey, JSON.stringify(votes));
}

function renderVotes() {
  const votes = readVotes();
  const usedVotes = document.getElementById('usedVotes');
  if (usedVotes) usedVotes.textContent = String(votes.length);

  document.querySelectorAll('.vote-button').forEach((button) => {
    const id = button.dataset.vote;
    const voted = votes.includes(id);
    const limitReached = votes.length >= voteLimit && !voted;
    button.classList.toggle('is-voted', voted);
    button.textContent = voted ? '已点赞' : '点赞';
    button.disabled = limitReached || voted;
    button.setAttribute(
      'aria-label',
      voted ? '已为该作品点赞' : limitReached ? '已用完 3 票' : '为该作品点赞'
    );
  });
}

document.querySelectorAll('.vote-button').forEach((button) => {
  button.addEventListener('click', () => {
    const id = button.dataset.vote;
    const votes = readVotes();
    if (!id || votes.includes(id) || votes.length >= voteLimit) return;
    votes.push(id);
    saveVotes(votes);
    renderVotes();
  });
});

renderVotes();
