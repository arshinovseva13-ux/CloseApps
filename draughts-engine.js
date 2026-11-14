/* Close Draughts Engine — international draughts 10x10.
   Independent browser engine. Rules: FMJD international draughts.
   Search: iterative deepening, alpha-beta negamax, transposition table, move ordering. */
(function (root) {
  'use strict';
  const SIZE = 10, PIECES = 50;
  const DIRS = [[-1,-1],[-1,1],[1,-1],[1,1]];
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const inside = (r,c) => r >= 0 && r < SIZE && c >= 0 && c < SIZE;
  function indexAt(r,c) {
    if (!inside(r,c) || ((r + c) & 1) !== 1) return -1;
    return r * 5 + Math.floor(c / 2);
  }
  function coords(i) {
    const r = Math.floor(i / 5), n = i % 5;
    return { r, c: n * 2 + (r % 2 === 0 ? 1 : 0) };
  }
  function initialBoard() {
    const b = Array(PIECES).fill(0);
    for (let r=0;r<4;r++) for (let c=0;c<10;c++) { const i=indexAt(r,c); if(i>=0)b[i]=-1; }
    for (let r=6;r<10;r++) for (let c=0;c<10;c++) { const i=indexAt(r,c); if(i>=0)b[i]=1; }
    return b;
  }
  const sign = p => p > 0 ? 1 : p < 0 ? -1 : 0;
  const isKing = p => Math.abs(p) === 2;
  function capturesForPiece(board, from, side) {
    const piece = board[from], king = isKing(piece), results = [];
    function walk(current, captured, path) {
      let extended = false;
      const {r,c} = coords(current);
      if (!king) {
        for (const [dr,dc] of DIRS) {
          const mr=r+dr, mc=c+dc, lr=r+2*dr, lc=c+2*dc;
          if (!inside(lr,lc) || !inside(mr,mc)) continue;
          const mid=indexAt(mr,mc), land=indexAt(lr,lc);
          if (mid < 0 || land < 0 || sign(board[mid]) !== -side || captured.includes(mid)) continue;
          if (board[land] !== 0 && land !== from) continue;
          extended = true;
          walk(land, captured.concat(mid), path.concat(land));
        }
      } else {
        for (const [dr,dc] of DIRS) {
          let rr=r+dr, cc=c+dc, enemy=-1;
          while (inside(rr,cc)) {
            const idx=indexAt(rr,cc);
            if (idx < 0) break;
            const cell = idx === from ? 0 : board[idx];
            if (cell === 0) {
              if (enemy >= 0) {
                extended = true;
                walk(idx, captured.concat(enemy), path.concat(idx));
              }
              rr+=dr; cc+=dc; continue;
            }
            if (sign(cell) === side || captured.includes(idx) || enemy >= 0) break;
            enemy=idx; rr+=dr; cc+=dc;
          }
        }
      }
      if (!extended && captured.length) {
        results.push({from, to:current, path:path.slice(), captures:captured.slice()});
      }
    }
    walk(from, [], []);
    return results;
  }
  function legalMoves(board, side) {
    const captures=[];
    for(let i=0;i<PIECES;i++) if(sign(board[i])===side) captures.push(...capturesForPiece(board,i,side));
    if(captures.length) {
      const max=Math.max(...captures.map(m=>m.captures.length));
      return captures.filter(m=>m.captures.length===max);
    }
    const moves=[];
    for(let i=0;i<PIECES;i++) {
      const p=board[i]; if(sign(p)!==side) continue;
      const {r,c}=coords(i);
      if(isKing(p)) {
        for(const [dr,dc] of DIRS) {
          let rr=r+dr,cc=c+dc;
          while(inside(rr,cc)) {
            const to=indexAt(rr,cc); if(to<0 || board[to]!==0) break;
            moves.push({from:i,to,path:[to],captures:[]}); rr+=dr;cc+=dc;
          }
        }
      } else {
        const dr=side===1?-1:1;
        for(const dc of [-1,1]) {
          const rr=r+dr,cc=c+dc,to=indexAt(rr,cc);
          if(to>=0 && board[to]===0) moves.push({from:i,to,path:[to],captures:[]});
        }
      }
    }
    return moves;
  }
  function applyMove(board, move) {
    const next=board.slice(), piece=next[move.from];
    next[move.from]=0;
    for(const i of move.captures||[]) next[i]=0;
    next[move.to]=piece;
    const {r}=coords(move.to);
    if(piece===1 && r===0) next[move.to]=2;
    if(piece===-1 && r===9) next[move.to]=-2;
    return next;
  }
  function evaluate(board, side) {
    let score=0, whiteCount=0, blackCount=0;
    for(let i=0;i<PIECES;i++) {
      const p=board[i]; if(!p)continue;
      const {r,c}=coords(i), s=sign(p), king=isKing(p);
      if(s===1)whiteCount++;else blackCount++;
      let v=king?315:100;
      if(!king) v += (s===1 ? 9-r : r) * 2.2;
      const center=(4.5-Math.abs(4.5-r))+(4.5-Math.abs(4.5-c));
      v += center * (king?2.1:0.7);
      if(!king && (c===0||c===9)) v+=1.5;
      score += s*v;
    }
    if(!whiteCount)return -side*90000;
    if(!blackCount)return side*90000;
    return score*side;
  }
  function moveScore(m, board, preferred) {
    let s=(m.captures.length*1000);
    if(preferred && preferred.from===m.from && preferred.to===m.to)s+=100000;
    const p=board[m.from];
    if((p===1 && coords(m.to).r===0)||(p===-1 && coords(m.to).r===9))s+=150;
    if(isKing(p))s+=5;
    return s;
  }
  function searchBestMove(board, side, options) {
    options=options||{};
    const maxDepth=Math.max(1,Math.min(8,options.maxDepth||4));
    const timeMs=Math.max(50,Math.min(10000,options.timeMs||900));
    const deadline=now()+timeMs, table=new Map();
    let nodes=0, best=null, completedDepth=0, bestScore=0;
    const TIMEOUT={timeout:true};
    function negamax(pos,turn,depth,alpha,beta,ply) {
      if(now()>deadline)throw TIMEOUT;
      nodes++;
      const key=pos.join(',')+'|'+turn, cached=table.get(key);
      if(cached && cached.depth>=depth) {
        if(cached.flag===0)return {score:cached.score,move:cached.move};
        if(cached.flag===1)alpha=Math.max(alpha,cached.score);
        if(cached.flag===-1)beta=Math.min(beta,cached.score);
        if(alpha>=beta)return {score:cached.score,move:cached.move};
      }
      const moves=legalMoves(pos,turn);
      if(!moves.length)return {score:-90000+ply,move:null};
      if(depth===0)return {score:evaluate(pos,turn),move:null};
      moves.sort((a,b)=>moveScore(b,pos,cached&&cached.move)-moveScore(a,pos,cached&&cached.move));
      const originalAlpha=alpha; let bestLocal=null, value=-Infinity;
      for(const m of moves) {
        const child=applyMove(pos,m);
        const result=negamax(child,-turn,depth-1,-beta,-alpha,ply+1);
        const score=-result.score;
        if(score>value){value=score;bestLocal=m;}
        if(score>alpha)alpha=score;
        if(alpha>=beta)break;
      }
      const flag=value<=originalAlpha?-1:value>=beta?1:0;
      table.set(key,{depth,score:value,flag,move:bestLocal});
      return {score:value,move:bestLocal};
    }
    const rootMoves=legalMoves(board,side);
    if(!rootMoves.length)return {move:null,score:-90000,depth:0,nodes:0};
    best=rootMoves[0];
    for(let depth=1;depth<=maxDepth;depth++) {
      try {
        let alpha=-Infinity,beta=Infinity,depthBest=null,depthScore=-Infinity;
        const ordered=rootMoves.slice().sort((a,b)=>moveScore(b,board)-moveScore(a,board));
        for(const m of ordered) {
          const score=-negamax(applyMove(board,m),-side,depth-1,-beta,-alpha,1).score;
          if(score>depthScore){depthScore=score;depthBest=m;}
          if(score>alpha)alpha=score;
        }
        if(depthBest){best=depthBest;bestScore=depthScore;completedDepth=depth;}
      } catch(e) { if(e!==TIMEOUT)throw e; break; }
      if(now()>deadline)break;
    }
    return {move:best,score:bestScore,depth:completedDepth,nodes};
  }
  const api={indexAt,coords,initialBoard,legalMoves,applyMove,evaluate,searchBestMove};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.CloseDraughtsEngine=api;
})(typeof self!=='undefined'?self:globalThis);
