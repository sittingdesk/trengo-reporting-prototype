// shadcn-vue AlertDialog — re-exports.
// Thin wrappers around reka-ui's AlertDialog primitives (focus trap, esc to close,
// focus parked on Cancel, no outside-click dismissal), themed with our design tokens.
// Standard shadcn-vue set, minus two pieces. No trigger: every confirm here is opened
// from state, not from a button that happens to sit beside the dialog. No action either
// — its whole job is closing on click, and doing that BEFORE the app's own click handler
// clears the pending target out from under it; the caller closes the dialog instead.
export { default as AlertDialog } from './AlertDialog.vue'
export { default as AlertDialogContent } from './AlertDialogContent.vue'
export { default as AlertDialogTitle } from './AlertDialogTitle.vue'
export { default as AlertDialogDescription } from './AlertDialogDescription.vue'
export { default as AlertDialogCancel } from './AlertDialogCancel.vue'
