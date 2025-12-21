import type { ProgrammingLanguage } from '../types';

export interface CodeSnippet {
  language: ProgrammingLanguage;
  displayName: string;
  code: string;
}

export const codeSnippets: CodeSnippet[] = [
  {
    language: 'java',
    displayName: 'Java',
    code: `class Solution {
    public boolean isValidBST(TreeNode root) {
        return helper(root, Long.MIN_VALUE, Long.MAX_VALUE);
    }
    
    private boolean helper(TreeNode root, long lower, long upper) {
        if (root == null) {
            return true;
        }
        if (root.val <= lower || root.val >= upper) {
            return false;
        }
        return helper(root.left, lower, root.val) 
            && helper(root.right, root.val, upper);
    }
}`,
  },
  {
    language: 'python',
    displayName: 'Python',
    code: `class Solution:
    def isValidBST(self, root: Optional[TreeNode], 
                   left=-inf, right=inf) -> bool:
        if root is None:
            return True
        x = root.val
        return left < x < right and \\
               self.isValidBST(root.left, left, x) and \\
               self.isValidBST(root.right, x, right)`,
  },
  {
    language: 'golang',
    displayName: 'Go',
    code: `func isValidBST(root *TreeNode) bool {
    return helper(root, math.MinInt64, math.MaxInt64)
}

func helper(root *TreeNode, lower, upper int64) bool {
    if root == nil {
        return true
    }
    if int64(root.Val) <= lower || int64(root.Val) >= upper {
        return false
    }
    return helper(root.Left, lower, int64(root.Val)) &&
           helper(root.Right, int64(root.Val), upper)
}`,
  },
  {
    language: 'javascript',
    displayName: 'JavaScript',
    code: `var isValidBST = function(root) {
    return helper(root, -Infinity, Infinity);
};

function helper(root, lower, upper) {
    if (root === null) {
        return true;
    }
    if (root.val <= lower || root.val >= upper) {
        return false;
    }
    return helper(root.left, lower, root.val) &&
           helper(root.right, root.val, upper);
}`,
  },
];

export const getCodeByLanguage = (language: ProgrammingLanguage): CodeSnippet => {
  return codeSnippets.find(s => s.language === language) || codeSnippets[0];
};
