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
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_zobrist_hash_new() {
        let zobrist = ZobristHash::new();
        assert_eq!(zobrist.hash(), 0);
    }

    #[test]
    fn test_zobrist_hash_update() {
        let mut zobrist = ZobristHash::new();
        let pos = Position::new(7, 7);
        zobrist.update(pos, Stone::Black);
        assert_ne!(zobrist.hash(), 0);
    }

    #[test]
    fn test_zobrist_hash_xor_reversible() {
        let mut zobrist = ZobristHash::new();
        let pos = Position::new(7, 7);
        zobrist.update(pos, Stone::Black);
        let hash_after_place = zobrist.hash();
        assert_ne!(hash_after_place, 0);
        // XOR 再次应用相同操作应该恢复原值
        zobrist.update(pos, Stone::Black);
        assert_eq!(zobrist.hash(), 0);
    }

    #[test]
    fn test_zobrist_different_positions() {
        let mut z1 = ZobristHash::new();
        let mut z2 = ZobristHash::new();
        z1.update(Position::new(0, 0), Stone::Black);
        z2.update(Position::new(0, 1), Stone::Black);
        assert_ne!(z1.hash(), z2.hash());
    }

    #[test]
    fn test_zobrist_different_stones() {
        let mut z1 = ZobristHash::new();
        let mut z2 = ZobristHash::new();
        z1.update(Position::new(7, 7), Stone::Black);
        z2.update(Position::new(7, 7), Stone::White);
        assert_ne!(z1.hash(), z2.hash());
    }

    #[test]
    fn test_zobrist_order_independent() {
        // 落子顺序不影响最终哈希值
        let mut z1 = ZobristHash::new();
        let mut z2 = ZobristHash::new();

        z1.update(Position::new(0, 0), Stone::Black);
        z1.update(Position::new(1, 1), Stone::White);

        z2.update(Position::new(1, 1), Stone::White);
        z2.update(Position::new(0, 0), Stone::Black);

        assert_eq!(z1.hash(), z2.hash());
    }

    #[test]
    fn test_transposition_table_store_and_get() {
        let mut tt = TranspositionTable::new(1024);
        let entry = TTEntry {
            hash: 12345,
            depth: 4,
       score: 100,
            flag: TTFlag::Exact,
            best_move: Some(Position::new(7, 7)),
        };
        tt.store(entry);
        let retrieved = tt.get(12345);
        assert!(retrieved.is_some());
        let r = retrieved.unwrap();
        assert_eq!(r.score, 100);
        assert_eq!(r.depth, 4);
        assert_eq!(r.flag, TTFlag::Exact);
        assert_eq!(r.best_move, Some(Position::new(7, 7)));
    }

    #[test]
    fn test_transposition_table_miss() {
        let tt = TranspositionTable::new(1024);
        assert!(tt.get(99999).is_none());
    }

    #[test]
    fn test_transpon_table_hash_collision_different_hash() {
        let mut tt = TranspositionTable::new(1024);
        let entry = TTEntry {
            hash: 12345,
            depth: 4,
            score: 100,
            flag: TTFlag::Exact,
            best_move: None,
        };
        tt.store(entry);
        // 查询不同的哈希值，即使索引相同也应该返回 None
        let different_hash = 12345 + 1024; // 可能映射到相同索引
        let retrieved = tt.get(different_hash);
        // 如果哈希不匹配，应该返回 None
        if let Some(r) = retrieved {
            assert_eq!(r.hash, different_hash);
        }
    }

    #[test]
    fn test_transposition_table_replace_deeper() {
        let mut tt = TranspositionTable::new(1024);
        let entry1 = TTEntry {
            hash: 12345,
            depth: 2,
            score: 50,
            flag: TTFlag::Exact,
            best_move: None,
        };
        let entry2 = TTEntry {
            hash: 12345,
            depth: 4,
            score: 100,
            flag: TTFlag::Exact,
            best_move: None,
        };
        tt.store(entry1);
        tt.store(entry2);
        // 相同哈希，深度更大的应该替换
        assert_eq!(tt.get(12345).unwrap().score, 100);
    }

    #[test]
    fn test_transposition_table_same_hash_always_replace() {
        let mut tt = TranspositionTable::new(1024);
        let entry1 = TTEntry {
            hash: 12345,
            depth: 4,
            score: 100,
            flag: TTFlag::Exact,
            best_move: None,
        };
        let entry2 = TTEntry {
            hash: 12345,
            depth: 2, // 深度更小
            score: 50,
            flag: TTFlag::LowerBound,
            best_move: None,
        };
        tt.store(entry1);
        tt.store(entry2);
        // 相同哈希总是更新
        assert_eq!(tt.get(12345).unwrap().score, 50);
    }

    #[test]
    fn test_transposition_table_size_power_of_two() {
        let tt = TranspositionTable::new(1000);
        // 1000 应该被调整为 1024 (2^10)
        assert_eq!(tt.size, 1024);
    }

    #[test]
    fn test_tt_flag_variants() {
        assert_ne!(TTFlag::Exact, TTFlag::LowerBound);
        assert_ne!(TTFlag::LowerBound, TTFlag::UpperBound);
    }

    #[test]
    fn test_zobrist_default() {
        let zobrist: ZobristHash = Default::default();
        assert_eq!(zobrist.hash(), 0);
    }
}
