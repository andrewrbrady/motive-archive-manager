# List Component System

This document outlines the list component system that provides a consistent way to display searchable lists throughout the application.

## Components

### SearchBar

A reusable search input component with a search icon and optional reset button.

```tsx
import { SearchBar } from "@/components/ui/SearchBar";

<SearchBar
  value={searchQuery}
  onChange={setSearchQuery}
  onReset={resetSearch}
  placeholder="Search items..."
/>;
```

### FilterContainer

A container for search inputs and other filter controls.

```tsx
import { FilterContainer } from "@/components/ui/FilterContainer";

<FilterContainer>
  <div className="flex-1 min-w-[200px]">
    <SearchBar value={searchQuery} onChange={setSearchQuery} />
  </div>
  {/* Additional filter components can be added here */}
</FilterContainer>;
```

### ListContainer

A container that applies consistent styling to lists.

```tsx
import { ListContainer } from "@/components/ui/ListContainer";

<ListContainer>
  <Table>{/* Table content */}</Table>
</ListContainer>;
```

## Implementation Example

Here's an example of implementing a list view with search functionality:

```tsx
import { useState, useEffect } from "react";
import { SearchBar } from "@/components/ui/SearchBar";
import { FilterContainer } from "@/components/ui/FilterContainer";
import { ListContainer } from "@/components/ui/ListContainer";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

export default function ItemsList() {
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    // Fetch items
    fetchItems();
  }, []);

  useEffect(() => {
    filterItems();
  }, [items, searchQuery]);

  const filterItems = () => {
    if (!searchQuery.trim()) {
      setFilteredItems(items);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = items.filter((item) =>
      item.name.toLowerCase().includes(query)
    );

    setFilteredItems(filtered);
  };

  const resetSearch = () => {
    setSearchQuery("");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Items</h2>
        <Button>Add Item</Button>
      </div>

      <FilterContainer>
        <div className="flex-1 min-w-[200px]">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            onReset={resetSearch}
            placeholder="Search items..."
          />
        </div>
      </FilterContainer>

      <ListContainer>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.description}</TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ListContainer>
    </div>
  );
}
```

## CSS Classes

You can also use the CSS classes from our list styles directly:

- `list-container`: For containers that hold lists
- `filter-container`: For containers that hold filters
- `search-input-container`: For search input wrappers
- `status-badge`: For status indicators
- `empty-state`: For empty state messages
- `loading-state`: For loading indicators

See `src/styles/list-styles.css` for the complete set of styles.

## Best Practices

1. Always use `ListContainer` for any data tables or lists to ensure consistent styling
2. Place search functionality and other filters in the `FilterContainer`
3. Use the `SearchBar` component for all search inputs
4. Implement filtering logic in a useEffect that depends on both the source data and search query
5. For new data listing pages, follow the pattern used in the Users and Locations tabs
