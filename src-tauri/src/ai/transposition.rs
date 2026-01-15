use crate::game::board::BOARD_SIZE;
use crate::game::types::{Position, Stone};
use lazy_static::lazy_static;
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};

// 静态 Zobrist 表，避免每次创建 ZobristHash 时重新计算
lazy_static! {
    static ref ZOBRIST_TABLE: [[[u64; 2]; BOARD_SIZE]; BOARD_SIZE] = {
        let mut table = [[[0u64; 2]; BOARD_SIZE]; BOARD_SIZE];
        for (row, row_arr) in table.iter_mut().enumerate() {
            for (col, col_arr) in row_arr.iter_mut().enumerate() {
                for (stone, val) in col_arr.iter_mut().enumerate() {
                    let mut hasher = DefaultHasher::new();
                    (row, col, stone, "zobrist").hash(&mut hasher);
                    *val = hasher.finish();
                }
            }
        }
        table
    };
}

/// Zobrist 哈希，用于生成棋盘的唯一标识
pub struct ZobristHash {
    pub current_hash: u64,
}

impl ZobristHash {
    pub fn new() -> Self {
        Self { current_hash: 0 }
    }

    /// 更新哈希值（落子或撤销都使用 XOR）
    pub fn update(&mut self, pos: Position, stone: Stone) {
        let stone_idx = match stone {
            Stone::Black => 0,
            Stone::White => 1,
        };
        self.current_hash ^= ZOBRIST_TABLE[pos.row][pos.col][stone_idx];
    }

    /// 获取当前哈希值
    pub fn hash(&self) -> u64 {
        self.current_hash
    }
}

impl Default for ZobristHash {
    fn default() -> Self {
        Self::new()
    }
}

/// 置换表条目标志
#[derive(Clone, Copy, PartialEq, Eq)]
pub enum TTFlag {
    Exact,      // 精确值
    LowerBound, // 下界（beta 截断）
    UpperBound, // 上界（alpha 截断）
}

/// 置换表条目
#[derive(Clone, Copy)]
pub struct TTEntry {
    pub hash: u64,
    pub depth: u32,
    pub score: i32,
    pub flag: TTFlag,
    pub best_move: Option<Position>,
}

/// 置换表 - 使用固定大小数组，避免 HashMap 开销
pub struct TranspositionTable {
    entries: Vec<Option<TTEntry>>,
    size: usize,
}

impl TranspositionTable {
    pub fn new(size: usize) -> Self {
        // 确保 size 是 2 的幂，便于取模优化
        let size = size.next_power_of_two();
        Self {
            entries: vec![None; size],
            size,
        }
    }

    #[inline]
    fn index(&self, hash: u64) -> usize {
        (hash as usize) & (self.size - 1) // 位运算取模，比 % 更快
    }

    /// 查询置换表
    pub fn get(&self, hash: u64) -> Option<&TTEntry> {
        let idx = self.index(hash);
        self.entries[idx].as_ref().filter(|e| e.hash == hash)
    }

    /// 存储到置换表，使用深度优先替换策略
    pub fn store(&mut self, entry: TTEntry) {
        let idx = self.index(entry.hash);

        // 替换策略：深度更大或相同哈希时替换
        let should_replace = match &self.entries[idx] {
            None => true,
            Some(existing) => {
                // 相同局面总是更新
                if existing.hash == entry.hash {
                    true
                } else {
                    // 不同局面时，深度更大才替换
                    entry.depth >= existing.depth
                }
            }
        };

        if should_replace {
            self.entries[idx] = Some(entry);
        }
    }
}

impl Default for TranspositionTable {
    fn default() -> Self {
        Self::new(1 << 20) // 约 100 万条目
    }
}
