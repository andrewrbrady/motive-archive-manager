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

## CRITICAL: Dropdown Implementation in Modals

### The Problem

When using dropdown components inside Dialog/Modal components, hover states and positioning don't work due to CSS `pointer-events: none` inheritance from the modal's body lock mechanism.

### The ONLY Working Solution: Portal with Pointer Events Fix

**ALWAYS use CustomDropdown for any dropdown inside a modal.** Never use Radix Select components in modal contexts.

```tsx
import { CustomDropdown } from "@/components/ui/custom-dropdown";

// ✅ CORRECT: Use CustomDropdown in modals
<Dialog>
  <DialogContent>
    <CustomDropdown
      value={selectedValue}
      onChange={setSelectedValue}
      options={[
        { value: "option1", label: "Option 1" },
        { value: "option2", label: "Option 2" },
        { value: "option3", label: "Option 3" },
      ]}
      placeholder="Select an option"
    />
  </DialogContent>
</Dialog>

// ❌ NEVER: Use Radix Select in modals
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

### CustomDropdown Features

The CustomDropdown component uses a portal-based approach that:

- **Renders to document.body** via createPortal to escape modal constraints
- **Uses pointer-events fix** with wrapper `pointer-events: none` and dropdown `pointer-events: auto`
- **Calculates position accurately** using getBoundingClientRect()
- **Handles viewport constraints** to prevent off-screen positioning
- **Uses high z-index** (99999) to appear above all modals
- **Supports icons** for better visual hierarchy
- **Includes keyboard navigation** (Escape key to close)
- **Provides smooth interactions** without slide animations that cause "flying in" effects

### Technical Implementation

```tsx
// Portal wrapper - covers viewport but doesn't block interactions
<div
  style={{
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: "none", // Don't block interactions elsewhere
    zIndex: 99999, // Above everything
  }}
>
  {/* Dropdown content - restores pointer events */}
  <div
    style={{
      position: "absolute",
      top: calculatedTop,
      left: calculatedLeft,
      width: calculatedWidth,
      pointerEvents: "auto", // CRITICAL: Restore pointer events
    }}
    className="bg-background rounded-lg border border-input shadow-xl overflow-y-auto max-h-60"
  >
    {/* Dropdown items */}
  </div>
</div>
```

### When to Use Each Component

**Use CustomDropdown:**

- ✅ Inside Dialog/Modal components
- ✅ In forms that are rendered in modals
- ✅ When you need reliable hover states
- ✅ For project management interfaces
- ✅ Any dropdown that needs to work in constrained containers

**Use Radix Select:**

- ✅ In regular page content (outside modals)
- ✅ In navigation components
- ✅ When you need advanced Select features (groups, search, etc.)
- ✅ For simple dropdowns in unconstrained layouts

### Migration Pattern

When converting from Select to CustomDropdown:

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

### Dropdown Styling Guidelines

**Use white border hover** for dropdown items:

```tsx
// ✅ Correct dropdown item styling
className =
  "flex w-full items-center gap-3 px-3 py-2.5 text-sm border border-transparent hover:border-white/80 rounded-md disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300 ease-out hover:shadow-sm mb-1 last:mb-0";

// ❌ Avoid background hover in dropdowns
className = "hover:bg-accent hover:text-accent-foreground";
```

**Container styling for friendly feel:**

```tsx
className =
  "bg-background rounded-lg border border-input shadow-xl overflow-y-auto max-h-60 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent";
```

### Z-Index Management

All dropdown components use consistent z-index values:

```tsx
// Modal overlays
Dialog: z - 50;

// Dropdown content (above modals)
CustomDropdown: z - 99999;
SelectContent: z - [100];
DropdownMenuContent: z - [100];
```

### Critical Rules

1. **NEVER use Radix Select inside Dialog/Modal components**
2. **ALWAYS use CustomDropdown for modal dropdowns**
3. **Use portal approach with pointer-events fix**
4. **Remove slide animations** to prevent "flying in" effects
5. **Test hover states work in modal context**
6. **Ensure outside click closes dropdown**

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

- **Use CustomDropdown inside modals/dialogs** to avoid event bubbling
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
