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

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

### Handling Optional Values

When you need to represent "no selection" or "unassigned" states:

```tsx
// 1. Use special values in your state
const [assignedUser, setAssignedUser] = useState("unassigned");

// 2. Convert to/from API format
const handleSubmit = () => {
  const apiData = {
    assignedTo: assignedUser === "unassigned" ? undefined : assignedUser,
  };
  // Send to API
};

// 3. Initialize from API data
useEffect(() => {
  if (data.assignedTo) {
    setAssignedUser(data.assignedTo);
  } else {
    setAssignedUser("unassigned");
  }
}, [data]);
```

### Common Select Patterns

#### User Assignment Select

```tsx
<Select value={assignedTo} onValueChange={setAssignedTo}>
  <SelectTrigger>
    <SelectValue placeholder="Select team member" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="unassigned">Unassigned</SelectItem>
    {users.map((user) => (
      <SelectItem key={user.id} value={user.id}>
        {user.name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

#### Status Filter Select

```tsx
<Select value={statusFilter} onValueChange={setStatusFilter}>
  <SelectTrigger>
    <SelectValue placeholder="Filter by status" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">All Statuses</SelectItem>
    <SelectItem value="active">Active</SelectItem>
    <SelectItem value="pending">Pending</SelectItem>
    <SelectItem value="completed">Completed</SelectItem>
  </SelectContent>
</Select>
```

#### Category Select with None Option

```tsx
<Select value={category} onValueChange={setCategory}>
  <SelectTrigger>
    <SelectValue placeholder="Select category" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="none">No Category</SelectItem>
    <SelectItem value="materials">Materials</SelectItem>
    <SelectItem value="labor">Labor</SelectItem>
    <SelectItem value="equipment">Equipment</SelectItem>
  </SelectContent>
</Select>
```

### Form Integration Patterns

#### With React Hook Form

```tsx
<FormField
  control={form.control}
  name="assignedTo"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Assigned To</FormLabel>
      <Select
        onValueChange={field.onChange}
        defaultValue={field.value || "unassigned"}
      >
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Select team member" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="unassigned">Unassigned</SelectItem>
          {users.map((user) => (
            <SelectItem key={user.id} value={user.id}>
              {user.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

#### With State Management

```tsx
const [formData, setFormData] = useState({
  title: "",
  assignedTo: "unassigned",
  category: "none",
  status: "pending",
});

const handleSelectChange = (field: string, value: string) => {
  setFormData((prev) => ({
    ...prev,
    [field]: value,
  }));
};

// In JSX
<Select
  value={formData.assignedTo}
  onValueChange={(value) => handleSelectChange("assignedTo", value)}
>
  <SelectTrigger>
    <SelectValue placeholder="Select assignee" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="unassigned">Unassigned</SelectItem>
    {/* other options */}
  </SelectContent>
</Select>;
```

### Special Value Conventions

Use these conventional values for common "empty" states:

- `"unassigned"` - For user assignments
- `"none"` - For categories, locations, containers
- `"all"` - For filters that show all items
- `"default"` - For default selections
- `"other"` - For custom/other options

### Validation Patterns

```tsx
// Validate that required selects aren't in "empty" state
const validateForm = () => {
  const errors = [];

  if (formData.assignedTo === "unassigned" && isAssignmentRequired) {
    errors.push("Assignment is required");
  }

  if (formData.category === "none" && isCategoryRequired) {
    errors.push("Category is required");
  }

  return errors;
};
```

### Accessibility Considerations

```tsx
<Select value={value} onValueChange={onChange}>
  <SelectTrigger aria-label="Select team member">
    <SelectValue placeholder="Select team member" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="unassigned">
      <span className="flex items-center gap-2">
        <User className="h-4 w-4" />
        Unassigned
      </span>
    </SelectItem>
    {/* other options */}
  </SelectContent>
</Select>
```

### Summary

- **Never use empty string values** in SelectItem components
- **Use descriptive special values** like "unassigned", "none", "all"
- **Convert special values to undefined/null** when sending to APIs
- **Initialize with special values** when loading from APIs
- **Follow consistent naming conventions** across the application
- **Add proper validation** for required fields
- **Include accessibility attributes** for screen readers
