# Motive Archive Manager - UI Styling Guide

## Card Component Styling Guidelines

### Critical Card Spacing Rule

**ALWAYS use `pt-4` instead of `pt-0` for CardContent to prevent content jamming against header borders.**

The default Card components have a built-in spacing issue:

- `CardHeader` has `p-6 border-b border-border-primary`
- `CardContent` has `p-6 pt-0` (removes top padding)
- This causes content to jam against the header border

### Proper Card Styling

```tsx
<Card>
  <CardHeader>
    <CardTitle>Your Title</CardTitle>
  </CardHeader>
  <CardContent className="pt-4">
    {/* Your content with proper spacing */}
  </CardContent>
</Card>
```

### Card Content Spacing Patterns

```tsx
// For content with multiple sections
<CardContent className="pt-4 space-y-4">
  <div>Section 1</div>
  <div>Section 2</div>
</CardContent>

// For simple content
<CardContent className="pt-4">
  <p>Simple content</p>
</CardContent>

// For grid layouts
<CardContent className="pt-4">
  <div className="grid grid-cols-2 gap-4">
    <div>Item 1</div>
    <div>Item 2</div>
  </div>
</CardContent>
```

## Page Layout Structure

### Standard Page Layout

```tsx
<div className="min-h-screen bg-background">
  <main className="container-wide px-6 py-8">
    <div className="space-y-6 sm:space-y-8">
      {/* Page Title */}
      <PageTitle title="Page Name" count={optionalCount}>
        {/* Optional right-aligned content */}
      </PageTitle>

      {/* Page Content */}
      <div className="space-y-6">{/* Your content sections */}</div>
    </div>
  </main>
</div>
```

### Container Classes

- `container-wide`: Use for main page containers (max-width: 2200px)
- `container-fluid`: Use for full-width layouts
- `px-6 py-8`: Standard page padding

## Spacing System

### Vertical Spacing Hierarchy

```css
space-y-8  /* 32px - Between major page sections */
space-y-6  /* 24px - Between related sections */
space-y-4  /* 16px - Between related components */
space-y-3  /* 12px - Between closely related items */
space-y-2  /* 8px - Between very closely related items */
```

### Specific Use Cases

```tsx
// Page level spacing
<div className="space-y-6 sm:space-y-8">

// Section level spacing
<div className="space-y-6">

// Component level spacing
<div className="space-y-4">

// List items
<div className="space-y-3">
```

## Tab Component Styling

### Proper Tab Structure

```tsx
<Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
  <TabsList className="grid w-full grid-cols-5 bg-transparent border rounded-md h-auto p-1 gap-1">
    <TabsTrigger
      value="tab1"
      className="data-[state=active]:bg-transparent data-[state=active]:border data-[state=active]:border-border data-[state=active]:shadow-sm rounded-md data-[state=inactive]:border-transparent border hover:bg-accent/10"
    >
      Tab 1
    </TabsTrigger>
  </TabsList>

  <TabsContent value="tab1" className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle>Content Title</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">{/* Content */}</CardContent>
    </Card>
  </TabsContent>
</Tabs>
```

### Tab Styling Rules

- Use `bg-transparent` for TabsList background
- Use full border for active tabs, not just bottom border
- Add `gap-1` between tab triggers
- Use `space-y-6` for TabsContent

## Form and Input Styling

### Form Layout

```tsx
<div className="grid gap-4 py-4">
  <div className="grid gap-2">
    <Label htmlFor="field">Field Label</Label>
    <Input
      id="field"
      value={value}
      onChange={onChange}
      placeholder="Placeholder text"
    />
  </div>
</div>
```

### Form Spacing

- `gap-4` between form fields
- `gap-2` between label and input
- `py-4` for form container padding

## Button Styling Patterns

### Button Combinations

```tsx
// Primary action
<Button>Primary Action</Button>

// Secondary action
<Button variant="outline">Secondary Action</Button>

// Destructive action
<Button variant="destructive">Delete</Button>

// Icon with text
<Button>
  <Plus className="h-4 w-4 mr-2" />
  Add Item
</Button>

// Icon only
<Button variant="ghost" size="sm">
  <Edit className="h-4 w-4" />
</Button>
```

## Grid and Layout Patterns

### Responsive Grids

```tsx
// Two column layout
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  <div className="lg:col-span-2">Main content</div>
  <div>Sidebar</div>
</div>

// Card grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <Card>...</Card>
  <Card>...</Card>
  <Card>...</Card>
</div>

// Stats grid
<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
  <Card>Stat 1</Card>
  <Card>Stat 2</Card>
  <Card>Stat 3</Card>
  <Card>Stat 4</Card>
</div>
```

## Color and Theme Usage

### Background Colors

```tsx
// Page background
className = "bg-background";

// Card backgrounds (automatic from Card component)
// Secondary backgrounds
className = "bg-muted/50";

// Hover states
className = "hover:bg-muted/20";
```

### Text Colors

```tsx
// Primary text (automatic)
// Secondary text
className = "text-muted-foreground";

// Success states
className = "text-green-600";

// Error states
className = "text-red-600";
```

### Border Colors

```tsx
// Standard borders (automatic from border class)
// Subtle borders
className = "border-border/50";
```

## Component-Specific Patterns

### Badge Usage

```tsx
// Status badges
<Badge className="bg-blue-100 text-blue-800">Active</Badge>
<Badge className="bg-green-100 text-green-800">Completed</Badge>
<Badge variant="destructive">Overdue</Badge>
<Badge variant="outline">Draft</Badge>
```

### Progress Indicators

```tsx
<Progress value={percentage} className="mt-2" />
```

### Loading States

```tsx
<div className="flex items-center justify-center h-64">
  <div className="text-lg">Loading...</div>
</div>
```

## Common Mistakes to Avoid

### ❌ Don't Do This

```tsx
// Using pt-0 without considering border spacing
<CardContent className="pt-0">

// Inconsistent spacing
<div className="space-y-2 space-y-4"> // Conflicting classes

// Missing responsive breakpoints
<div className="grid-cols-3"> // Not responsive
```

### ✅ Do This Instead

```tsx
// Proper card spacing
<CardContent className="pt-4">

// Consistent spacing
<div className="space-y-4">

// Responsive design
<div className="grid grid-cols-1 md:grid-cols-3">
```

## Debugging Spacing Issues

### Tools to Use

1. **Browser DevTools**: Inspect elements to see applied classes
2. **Tailwind CSS IntelliSense**: VS Code extension for class suggestions
3. **Class conflicts**: Check for conflicting Tailwind classes

### Common Issues

1. **Card content touching borders**: Use `pt-4` instead of `pt-0`
2. **Inconsistent spacing**: Use the spacing hierarchy consistently
3. **Missing responsive breakpoints**: Always consider mobile-first design
4. **Z-index conflicts**: Use proper layering with modals and popovers

## Best Practices Summary

1. **Always use `pt-4` for CardContent** to avoid border jamming
2. **Follow the spacing hierarchy** (8, 6, 4, 3, 2)
3. **Use responsive grid classes** for all layouts
4. **Maintain consistent button patterns** across the app
5. **Use the PageTitle component** for all page headers
6. **Test on mobile devices** to ensure responsive design works
7. **Use semantic HTML** with proper ARIA labels for accessibility

## Modal and Dialog Patterns

### Calendar in Modals

When using date pickers in modals, avoid Popover-based calendars that can cause modal closure issues. Use inline calendars or native date inputs:

```tsx
// ❌ Avoid: Popover calendar in modal
<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline">
      <CalendarIcon className="mr-2 h-4 w-4" />
      {format(date, "PPP")}
    </Button>
  </PopoverTrigger>
  <PopoverContent>
    <Calendar mode="single" selected={date} onSelect={setDate} />
  </PopoverContent>
</Popover>

// ✅ Use: Inline calendar or native input
<Input
  type="date"
  value={format(date, "yyyy-MM-dd")}
  onChange={(e) => setDate(new Date(e.target.value))}
/>
```

### Dialog Content Spacing

```tsx
<DialogContent className="sm:max-w-[425px]">
  <DialogHeader>
    <DialogTitle>Dialog Title</DialogTitle>
    <DialogDescription>Dialog description</DialogDescription>
  </DialogHeader>
  <div className="grid gap-4 py-4">{/* Form content */}</div>
  <DialogFooter>
    <Button variant="outline">Cancel</Button>
    <Button>Save</Button>
  </DialogFooter>
</DialogContent>
```

## User Dropdown Implementation Patterns

### Critical: Avoiding Event Bubbling Issues

When implementing user selection dropdowns, especially inside modals or dialogs, you must choose the right pattern to avoid event bubbling conflicts that prevent user selection.

### ✅ Pattern 1: Custom Dropdown (Recommended for Modals)

Use this pattern when implementing user selection inside modals, dialogs, or complex nested components:

```tsx
import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronDown, ChevronUp, User } from "lucide-react";

interface User {
  _id: string;
  name: string;
  email: string;
  image?: string;
}

function CustomUserDropdown({
  value,
  onChange,
  users,
  placeholder = "Select a user",
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedUser = users.find((user) => user._id === value);

  const handleSelectUser = (userId: string) => {
    onChange(userId);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center justify-between w-full px-3 py-2 text-sm rounded-md border border-input bg-background h-10 hover:bg-accent"
      >
        <div className="flex items-center gap-2 truncate">
          {selectedUser ? (
            <>
              <Avatar className="h-5 w-5">
                <AvatarImage src={selectedUser.image} alt={selectedUser.name} />
                <AvatarFallback className="text-[10px]">
                  {selectedUser.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{selectedUser.name}</span>
            </>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-background rounded-md border border-input shadow-md overflow-y-auto max-h-60">
          <div className="py-1">
            {users.map((user) => (
              <button
                key={user._id}
                type="button"
                className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                onClick={() => handleSelectUser(user._id)}
              >
                <Avatar className="h-5 w-5">
                  <AvatarImage src={user.image} alt={user.name} />
                  <AvatarFallback className="text-[10px]">
                    {user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start">
                  <span className="truncate">{user.name}</span>
                  <span className="text-xs text-muted-foreground truncate">
                    {user.email}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

### ✅ Pattern 2: shadcn Select (Safe for Non-Modal Contexts)

Use this pattern for user selection in regular forms, NOT inside modals:

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function SafeUserSelect({
  value,
  onChange,
  users,
  placeholder = "Select a user",
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {users.map((user) => (
          <SelectItem key={user._id} value={user._id}>
            {user.name} ({user.email})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

### ❌ Pattern 3: What NOT to Do

**Never use shadcn Select inside Dialog/Modal components** - this causes event bubbling issues:

```tsx
// ❌ This will cause selection issues
<Dialog>
  <DialogContent>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select a user" />
      </SelectTrigger>
      <SelectContent>
        {users.map((user) => (
          <SelectItem key={user._id} value={user._id}>
            {user.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </DialogContent>
</Dialog>
```

### User Data Fetching Pattern

Always fetch users when the dropdown opens, not when the component mounts:

```tsx
const [users, setUsers] = useState<User[]>([]);
const [loadingUsers, setLoadingUsers] = useState(false);

const fetchUsers = async () => {
  try {
    setLoadingUsers(true);
    const response = await fetch("/api/users");
    if (!response.ok) throw new Error("Failed to fetch users");

    const data = await response.json();
    setUsers(data.users || []);
  } catch (error) {
    console.error("Error fetching users:", error);
    toast({
      title: "Error",
      description: "Failed to load users",
      variant: "destructive",
    });
  } finally {
    setLoadingUsers(false);
  }
};

// Fetch when dropdown opens
const handleDropdownOpen = () => {
  if (!isOpen) {
    fetchUsers();
  }
  setIsOpen(true);
};
```

### User Display Patterns

**Show both name and email for clarity:**

```tsx
// In dropdown options
<span className="truncate">{user.name}</span>
<span className="text-xs text-muted-foreground truncate">({user.email})</span>

// In selected display
{selectedUser ? (
  <span className="truncate">{selectedUser.name}</span>
) : (
  <span className="text-muted-foreground">{placeholder}</span>
)}
```

### Loading States

Always show loading states during user fetching:

```tsx
{loadingUsers ? (
  <div className="flex items-center justify-center p-2">
    <Loader2 className="h-4 w-4 animate-spin mr-2" />
    <span>Loading users...</span>
  </div>
) : users.length === 0 ? (
  <div className="px-2 py-1 text-xs text-muted-foreground">
    No users found
  </div>
) : (
  // User list
)}
```

### Event Handling Best Practices

1. **Use `type="button"`** on all dropdown buttons to prevent form submission
2. **Handle clicks with `onClick`**, not `onSelect` or other events
3. **Use `useRef` and `useEffect`** for outside click detection
4. **Prevent event propagation** when necessary:

```tsx
const handleUserSelect = (userId: string, event?: React.MouseEvent) => {
  event?.stopPropagation(); // Prevent bubbling if needed
  onChange(userId);
  setIsOpen(false);
};
```

### Accessibility Considerations

```tsx
// Add proper ARIA attributes
<button
  type="button"
  onClick={toggleDropdown}
  aria-expanded={isOpen}
  aria-haspopup="listbox"
  aria-label="Select user"
  className="..."
>

// Add role and aria-selected to options
<button
  type="button"
  role="option"
  aria-selected={user._id === value}
  onClick={() => handleSelectUser(user._id)}
  className="..."
>
```

### Summary

- **Use custom dropdowns inside modals/dialogs** to avoid event bubbling
- **Use shadcn Select for regular forms** outside of modal contexts
- **Always fetch users on dropdown open**, not component mount
- **Show loading states** and handle errors gracefully
- **Display both name and email** for user clarity
- **Use proper event handling** with `type="button"` and click handlers

## Select Component Implementation Patterns

### Critical: Avoiding Empty Value Errors

**NEVER use empty string values in SelectItem components** - this causes Radix UI errors and breaks the component.

### ✅ Correct Select Implementation

```tsx
// For optional selections, use a special value instead of empty string
<Select value={selectedValue} onValueChange={setSelectedValue}>
  <SelectTrigger>
    <SelectValue placeholder="Select an option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="none">No selection</SelectItem>
    <SelectItem value="unassigned">Unassigned</SelectItem>
    <SelectItem value="all">All items</SelectItem>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
  </SelectContent>
</Select>
```

### ❌ Incorrect Select Implementation

```tsx
// DON'T DO THIS - empty string values cause errors
<Select value={selectedValue} onValueChange={setSelectedValue}>
  <SelectTrigger>
    <SelectValue placeholder="Select an option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="">No selection</SelectItem> {/* ❌ ERROR */}
    <SelectItem value="option1">Option 1</SelectItem>
  </SelectContent>
</Select>
```

### Critical: SelectTrigger Hover States in Modals

**SOLUTION: Use CustomDropdown instead of Radix Select in modal contexts**

The Radix UI Select component has persistent hover state issues when used inside Dialog/Modal components. This is a known limitation that cannot be reliably fixed with CSS or configuration changes.

#### ✅ Correct Implementation for Modals

Use the `CustomDropdown` component for all dropdown selections inside modals:

```tsx
import { CustomDropdown } from "@/components/ui/custom-dropdown";

// Inside a Dialog/Modal
<CustomDropdown
  value={selectedValue}
  onChange={setSelectedValue}
  options={[
    { value: "option1", label: "Option 1" },
    { value: "option2", label: "Option 2" },
    { value: "option3", label: "Option 3" },
  ]}
  placeholder="Select an option"
  disabled={false}
  className="w-full"
/>;
```

#### ❌ Avoid: Radix Select in Modals

```tsx
// DON'T DO THIS - hover states don't work properly in modals
<Dialog>
  <DialogContent>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select option" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="option1">Option 1</SelectItem>
      </SelectContent>
    </Select>
  </DialogContent>
</Dialog>
```

#### CustomDropdown Features

- **Proper hover states** that work inside modals
- **Keyboard navigation** support
- **Outside click detection** to close dropdown
- **Consistent styling** that matches other UI components
- **TypeScript support** with proper option types
- **Disabled state** support
- **Custom className** support for sizing

#### When to Use Each Component

**Use CustomDropdown:**

- Inside Dialog/Modal components
- In forms that are rendered in modals
- When you need reliable hover states
- For project management interfaces

**Use Radix Select:**

- In regular page content (outside modals)
- In navigation components
- When you need advanced Select features (groups, search, etc.)

#### Migration Pattern

When migrating from Select to CustomDropdown:

```tsx
// Before (Select)
<Select value={value} onValueChange={onChange}>
  <SelectTrigger>
    <SelectValue placeholder="Select option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
  </SelectContent>
</Select>

// After (CustomDropdown)
<CustomDropdown
  value={value}
  onChange={onChange}
  options={[
    { value: "option1", label: "Option 1" },
    { value: "option2", label: "Option 2" },
  ]}
  placeholder="Select option"
/>
```

#### Root Cause: Dialog Body Lock

When a Dialog opens, it applies `pointer-events: none` to the `<body>` element to prevent background scrolling. Any dropdown content that is portaled to the body (the default behavior) inherits this rule, making the browser never consider your cursor "inside" the menu, so hover styles don't fire.

The CustomDropdown component avoids this issue by:

1. **Not using portals** - content stays within the modal's DOM tree
2. **Manual event handling** - uses proper click and focus events
3. **Custom positioning** - uses absolute positioning within the container
4. **Proper z-index management** - ensures dropdown appears above other content

### Components Using CustomDropdown

The following components have been updated to use CustomDropdown:

- `ProjectDeliverablesTab.tsx` - All form dropdowns in modal
- `ProjectOverviewTab.tsx` - Expense category dropdown in modal
- `ProjectAssetsTab.tsx` - Asset type dropdown in modal
- `ProjectTeamTab.tsx` - Role selection dropdown in modal
- `ProjectEventsTab.tsx` - Event type and status dropdowns in modal
- `src/app/projects/page.tsx` - Filter dropdowns (not in modal, but for consistency)
- `src/app/projects/new/page.tsx` - Project type and priority dropdowns

### Summary

- **Never use Radix Select inside Dialog/Modal components** - hover states will not work
- **Use CustomDropdown for all modal dropdown needs** - provides reliable interaction
- **Keep Radix Select for regular page content** - works fine outside of modals
- **Follow the migration pattern** when converting existing Select components

## Selectable Card/Button Hover States

### White Border Hover Pattern

For selectable cards or buttons (like car selection, item selection, etc.), use a **white border on hover** instead of background color changes for better visual hierarchy and cleaner aesthetics.

#### ✅ Correct Hover Implementation

```tsx
// Selectable card with white border hover
<button
  className={`flex items-center space-x-3 p-3 border rounded-lg transition-all text-left w-full ${
    isSelected
      ? "border-blue-500/50" // Selected state with subtle blue border
      : "border-[hsl(var(--border-subtle))] hover:border-white" // White border on hover
  }`}
>
  {/* Card content */}
</button>

// Alternative with more opacity control
<button
  className={`p-4 border rounded-lg transition-all ${
    isSelected
      ? "border-blue-500/60"
      : "border-border/30 hover:border-white/80"
  }`}
>
  {/* Card content */}
</button>
```

#### ❌ Avoid Gray Background Hovers

```tsx
// Don't use gray background hovers for selectable items
<button
  className={`p-3 border rounded-lg ${
    isSelected
      ? "border-blue-500"
      : "border-border hover:bg-accent" // ❌ Avoid this
  }`}
>
```

### Selection State Patterns

#### Basic Selection Pattern

```tsx
const [selectedItems, setSelectedItems] = useState<string[]>([]);

const handleItemSelection = (itemId: string) => {
  setSelectedItems((prev) =>
    prev.includes(itemId)
      ? prev.filter((id) => id !== itemId)
      : [...prev, itemId]
  );
};

// In render
{
  items.map((item) => {
    const isSelected = selectedItems.includes(item.id);

    return (
      <button
        key={item.id}
        onClick={() => handleItemSelection(item.id)}
        className={`p-3 border rounded-lg transition-all w-full text-left ${
          isSelected
            ? "border-blue-500/50"
            : "border-border/30 hover:border-white"
        }`}
      >
        <div className="flex items-center gap-3">{/* Item content */}</div>
      </button>
    );
  });
}
```

#### Multi-Select with Select All

```tsx
const handleSelectAll = () => {
  if (selectedItems.length === items.length) {
    setSelectedItems([]);
  } else {
    setSelectedItems(items.map((item) => item.id));
  }
};

// Select All button
<Button
  variant="outline"
  size="sm"
  onClick={handleSelectAll}
  className="border-[hsl(var(--border))]"
>
  {selectedItems.length === items.length ? "Deselect All" : "Select All"}
</Button>;
```

### Border Opacity Guidelines

Use these opacity levels for consistent visual hierarchy:

```tsx
// Default state - very subtle
"border-border/30";

// Hover state - bright and clear
"hover:border-white";

// Selected state - colored but not overwhelming
"border-blue-500/50";

// Focus state - slightly more prominent
"focus:border-blue-500/70";
```

### Transition Classes

Always include smooth transitions for selection states:

```tsx
className = "transition-all duration-200";
// or
className = "transition-colors duration-150";
```

### Complete Selectable Card Example

```tsx
interface SelectableCardProps {
  item: any;
  isSelected: boolean;
  onSelect: (id: string) => void;
  children: React.ReactNode;
}

function SelectableCard({
  item,
  isSelected,
  onSelect,
  children,
}: SelectableCardProps) {
  return (
    <button
      onClick={() => onSelect(item.id)}
      className={`
        flex items-center space-x-3 p-4 border rounded-lg 
        transition-all duration-200 text-left w-full
        ${
          isSelected
            ? "border-blue-500/50"
            : "border-border/30 hover:border-white"
        }
      `}
    >
      {children}
    </button>
  );
}

// Usage
<SelectableCard
  item={car}
  isSelected={selectedCarIds.includes(car.id)}
  onSelect={handleCarSelection}
>
  <div className="flex-shrink-0">
    <Avatar src={car.image} alt={car.name} />
  </div>
  <div className="flex-1">
    <h3 className="font-medium">{car.name}</h3>
    <p className="text-sm text-muted-foreground">{car.description}</p>
  </div>
  <Badge variant="outline">{car.status}</Badge>
</SelectableCard>;
```

### When to Use This Pattern

- **Car/vehicle selection interfaces**
- **File/document selection**
- **User/team member selection**
- **Product/item selection in lists**
- **Multi-select interfaces**
- **Gallery item selection**

### When NOT to Use This Pattern

- **Navigation buttons** (use standard button hover states)
- **Form inputs** (use input-specific hover states)
- **Action buttons** (use button variant hover states)
- **Menu items** (use menu-specific hover states)

### Critical: Z-Index Conflicts in Modals

**Dropdown components (Select, DropdownMenu, Tooltip) inside modals require higher z-index values** to appear above modal overlays. We use `z-[60]` for dropdown content to ensure it appears above modal overlays which use `z-50`.

#### ✅ Fixed Z-Index Values

Our UI components use these z-index values to prevent conflicts:

```tsx
// Modal overlays and content
Dialog: z - 50;
AlertDialog: z - 50;
Sheet: z - 50;

// Dropdown content (appears above modals)
SelectContent: z - [60];
DropdownMenuContent: z - [60];
DropdownMenuSubContent: z - [60];
TooltipContent: z - [60];
```

#### ❌ Common Z-Index Issues

```tsx
// DON'T DO THIS - SelectContent at same level as modal
<Dialog>
  {" "}
  {/* z-50 */}
  <DialogContent>
    <Select>
      <SelectContent className="z-50">
        {" "}
        {/* ❌ Same z-index as modal */}
        <SelectItem>Option</SelectItem>
      </SelectContent>
    </Select>
  </DialogContent>
</Dialog>
```

#### ✅ Correct Z-Index Implementation

```tsx
// DO THIS - SelectContent above modal
<Dialog>
  {" "}
  {/* z-50 */}
  <DialogContent>
    <Select>
      <SelectContent className="z-[60]">
        {" "}
        {/* ✅ Above modal */}
        <SelectItem>Option</SelectItem>
      </SelectContent>
    </Select>
  </DialogContent>
</Dialog>
```

### Z-Index Hierarchy

Use this hierarchy for consistent layering:

```tsx
// Base content
z-0 to z-10: Page content, cards, buttons

// Navigation and fixed elements
z-40: Fixed navigation, sticky headers

// Modals and overlays
z-50: Dialog, AlertDialog, Sheet overlays and content

// Dropdown content (above modals)
z-[60]: Select, DropdownMenu, Tooltip content

// Critical overlays
z-[70]: Loading overlays, critical notifications

// Debug/development
z-[9999]: Development tools, debug overlays
```

## Dropdown Hover States in Modals - CRITICAL SOLUTION

### The Problem

When using dropdown components inside Dialog/Modal components, hover states don't work due to CSS `pointer-events: none` inheritance from the modal's body lock mechanism. This affects:

- CustomDropdown components
- Radix UI Select components
- Any portaled content that extends outside modal boundaries

### The ONLY Working Solution: Portal with Pointer Events Fix

Use this exact pattern for dropdown components that need to work inside modals:

```tsx
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export function CustomDropdown(
  {
    /* props */
  }
) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Calculate position when opening
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: triggerRect.bottom + window.scrollY,
        left: triggerRect.left + window.scrollX,
        width: triggerRect.width,
      });
    }
  }, [isOpen]);

  const dropdownContent = isOpen ? (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: "none", // Don't block interactions elsewhere
        zIndex: 9999, // Above everything
      }}
    >
      <div
        ref={dropdownRef}
        className="bg-background rounded-md border border-input shadow-lg overflow-y-auto max-h-60"
        style={{
          position: "absolute",
          top: dropdownPosition.top,
          left: dropdownPosition.left,
          width: dropdownPosition.width,
          pointerEvents: "auto", // CRITICAL: Restore pointer events
        }}
      >
        <div className="py-1">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className="flex w-full items-center px-3 py-1.5 text-sm border border-transparent hover:border-white disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              onClick={() => handleSelectOption(option.value)}
              disabled={option.disabled}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="relative">
      <button ref={triggerRef} onClick={() => setIsOpen(!isOpen)}>
        {/* Trigger content */}
      </button>

      {/* Portal with pointer-events fix */}
      {typeof window !== "undefined" &&
        dropdownContent &&
        createPortal(dropdownContent, document.body)}
    </div>
  );
}
```

### Key Technical Points

1. **Portal to document.body**: Renders dropdown outside modal DOM tree
2. **Wrapper with `pointer-events: 'none'`**: Covers viewport but doesn't block interactions
3. **Dropdown with `pointer-events: 'auto'`**: Explicitly restores pointer events
4. **High z-index**: `zIndex: 9999` ensures it appears above modal overlays
5. **Absolute positioning**: Uses `getBoundingClientRect()` for exact placement

### Hover State Pattern for Dropdowns

Use **white border hover** with rounded corners, smooth animations, and better spacing for a friendly feel:

```tsx
// ✅ Correct dropdown item hover (smooth without scale)
className =
  "flex w-full items-center gap-3 px-3 py-2.5 text-sm border border-transparent hover:border-white/80 rounded-md disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300 ease-out hover:shadow-sm";

// ✅ Dropdown container styling (natural slide-down animation)
className =
  "bg-background rounded-lg border border-input shadow-xl overflow-y-auto max-h-60 animate-in slide-in-from-top-2 duration-200";

// ❌ Avoid background hover in dropdowns
className = "hover:bg-accent hover:text-accent-foreground";
```

### Icon Support in Dropdowns

The CustomDropdown component supports icons for better visual hierarchy:

```tsx
// ✅ Dropdown with icons
<CustomDropdown
  value={selectedValue}
  onChange={setSelectedValue}
  options={[
    {
      value: "production",
      label: "Production",
      icon: <Camera className="w-4 h-4 flex-shrink-0" />,
    },
    {
      value: "marketing",
      label: "Marketing",
      icon: <Sparkles className="w-4 h-4 flex-shrink-0" />,
    },
  ]}
  placeholder="Select option"
/>;

// Icon interface
interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: React.ReactNode; // Optional icon support
}
```

### Dropdown Styling Improvements

**Friendly Design Elements:**

- `rounded-lg` for dropdown container (more rounded than default)
- `shadow-xl` for better depth perception
- `py-3 px-2 pb-4` container padding for breathing room and clipping prevention
- `px-3 py-2.5` item padding for comfortable touch targets
- `gap-3` between icons and text
- `mb-1 last:mb-0` for item spacing without overflow
- `transition-all duration-300 ease-out` for smooth interactions
- `hover:border-white/80` for subtle white border hover
- `hover:shadow-sm` for depth change on hover
- `animate-in slide-in-from-top-2 duration-200` for natural dropdown animation

**Scrolling Support:**

- `overflow-y-auto max-h-60` enables vertical scrolling with max height of 240px
- `scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent` for styled scrollbars
- Scroll indicator appears when more than 6 options: "Scroll for more options"
- Smooth scrolling with proper padding to prevent clipping
- **CRITICAL**: `onWheel` event handlers required for scroll to work in portals

**Critical Scroll Wheel Event Handling:**
Portal dropdowns require explicit scroll wheel event handling to work properly:

```tsx
// Portal wrapper - allow wheel events to pass through
<div
  style={{ pointerEvents: "none" }}
  onWheel={(e) => {
    e.stopPropagation(); // CRITICAL for scrolling
  }}
>
  {/* Dropdown container */}
  <div
    style={{ pointerEvents: "auto" }}
    onWheel={(e) => {
      e.stopPropagation(); // CRITICAL for scrolling
    }}
  >
    {/* Scrollable content */}
    <div
      style={{ overflowY: "scroll" }}
      onWheel={(e) => {
        e.stopPropagation(); // CRITICAL for scrolling
      }}
      onScroll={(e) => {
        e.stopPropagation(); // Handle scroll events
      }}
    >
      {/* Content */}
    </div>
  </div>
</div>
```

**Clipping Prevention:**

- Container width: `dropdownPosition.width + 16` (adds extra width to prevent right-side clipping)
- Container padding: `py-3 px-2 pb-4` (prevents bottom clipping and provides side margins)
- Item margins: `mb-1 last:mb-0` (creates spacing between items without overflow)

### When to Use This Solution

**Use Portal Dropdown:**

- Inside Dialog/Modal components
- When dropdown needs to extend outside container boundaries
- For any dropdown that experiences hover/click issues in modals

**Use Regular Dropdown:**

- In normal page content (outside modals)
- When container has sufficient space for dropdown expansion

### Root Cause Explanation

When a Dialog opens:

1. `pointer-events: none` is applied to `<body>`
2. Any content portaled to body inherits this rule
3. Browser never considers cursor "inside" the dropdown
4. Hover states and clicks don't fire

The wrapper div with `pointer-events: 'none'` + dropdown with `pointer-events: 'auto'` pattern is the ONLY way to override this inheritance and restore proper interaction.

### Components Using This Pattern

Current components using the portal solution:

- `CustomDropdown` - All project modal dropdowns
- Used in: ProjectDeliverablesTab, ProjectOverviewTab, ProjectAssetsTab, ProjectTeamTab, ProjectEventsTab

### Migration Checklist

When converting a dropdown for modal use:

1. ✅ Add portal with createPortal
2. ✅ Add wrapper div with `pointer-events: 'none'`
3. ✅ Add dropdown div with `pointer-events: 'auto'`
4. ✅ Use `getBoundingClientRect()` for positioning
5. ✅ Set `zIndex: 9999`
6. ✅ Use white border hover instead of background hover
7. ✅ Test hover states work in modal
8. ✅ Test clicks work in modal
9. ✅ Test outside click closes dropdown
