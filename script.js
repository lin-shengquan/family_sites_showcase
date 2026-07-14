const voteLimit = 3;
const voterKey = 'family-sites-showcase-voter-id';
const works = ['yy', 'dc', 'lt', 'yufan', 'ym', 'ziyi', 'hs', 'jh'];

const config = window.FAMILY_SHOWCASE_CONFIG || {};
const hasSupabaseConfig =
  Boolean(config.supabaseUrl) &&
  Boolean(config.supabaseAnonKey) &&
  !config.supabaseUrl.includes('YOUR-') &&
  !config.supabaseAnonKey.includes('YOUR-');

let supabaseClient = null;
let votedWorks = new Set();
let voteTotals = new Map(works.map((id) => [id, 0]));
let isBusy = false;
let pendingWorkId = null;

function createVoterId() {
  if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function getVoterId() {
  let voterId = localStorage.getItem(voterKey);
  if (!voterId) {
    voterId = createVoterId();
    localStorage.setItem(voterKey, voterId);
  }
  return voterId;
}

function setStatus(message) {
  const dbStatus = document.getElementById('dbStatus');
  if (dbStatus) dbStatus.textContent = message;
}

function renderVotes() {
  const usedVotes = document.getElementById('usedVotes');
  if (usedVotes) usedVotes.textContent = String(votedWorks.size);

  document.querySelectorAll('[data-count]').forEach((counter) => {
    const id = counter.dataset.count;
    counter.textContent = String(voteTotals.get(id) || 0);
  });

  document.querySelectorAll('.vote-button').forEach((button) => {
    const id = button.dataset.vote;
    const voted = votedWorks.has(id);
    const limitReached = votedWorks.size >= voteLimit && !voted;
    const disabled = !hasSupabaseConfig || isBusy || voted || limitReached;
    const isPending = pendingWorkId === id;
    let label = '点赞';

    if (!hasSupabaseConfig) {
      label = '配置中';
    } else if (isPending) {
      label = '提交中';
    } else if (voted) {
      label = '已点赞';
    } else if (limitReached) {
      label = '票已用完';
    }

    button.classList.toggle('is-voted', voted);
    button.classList.toggle('is-loading', isPending);
    button.textContent = label;
    button.disabled = disabled;
    button.setAttribute(
      'aria-label',
      voted ? '已为该作品点赞' : limitReached ? '已用完 3 票' : '为该作品点赞'
    );
  });
}

async function fetchTotals() {
  const { data, error } = await supabaseClient.rpc('get_showcase_vote_totals');
  if (error) throw error;

  voteTotals = new Map(works.map((id) => [id, 0]));
  (data || []).forEach((row) => {
    voteTotals.set(row.work_id, Number(row.total_votes || 0));
  });
}

async function fetchVoterVotes() {
  const { data, error } = await supabaseClient.rpc('get_showcase_voter_votes', {
    p_voter_id: getVoterId()
  });
  if (error) throw error;

  votedWorks = new Set((data || []).map((row) => row.work_id));
}

async function refreshVotes() {
  if (!hasSupabaseConfig) {
    setStatus('请先配置数据库');
    renderVotes();
    return;
  }

  try {
    await Promise.all([fetchTotals(), fetchVoterVotes()]);
    setStatus('数据库已连接');
  } catch (error) {
    console.error(error);
    setStatus('数据库连接失败');
  } finally {
    renderVotes();
  }
}

async function castVote(workId) {
  if (!works.includes(workId) || votedWorks.has(workId) || votedWorks.size >= voteLimit) return;

  isBusy = true;
  pendingWorkId = workId;
  renderVotes();

  try {
    const { data, error } = await supabaseClient.rpc('cast_showcase_vote', {
      p_voter_id: getVoterId(),
      p_work_id: workId
    });
    if (error) throw error;

    if (data && data.ok === false) {
      const messageMap = {
        already_voted: '这个作品已经投过',
        limit_reached: '3 票已经用完',
        invalid_work: '作品不存在'
      };
      setStatus(messageMap[data.reason] || '投票未成功');
    } else {
      setStatus('投票成功');
    }

    await refreshVotes();
  } catch (error) {
    console.error(error);
    setStatus('投票失败，请稍后再试');
  } finally {
    isBusy = false;
    pendingWorkId = null;
    renderVotes();
  }
}

document.querySelectorAll('.vote-button').forEach((button) => {
  button.addEventListener('click', () => {
    castVote(button.dataset.vote);
  });
});

if (hasSupabaseConfig && window.supabase) {
  supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
  refreshVotes();
  window.setInterval(refreshVotes, 15000);
} else if (!hasSupabaseConfig) {
  setStatus('请先配置数据库');
  renderVotes();
} else {
  setStatus('数据库脚本加载失败');
  renderVotes();
}
