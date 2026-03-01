# UI Components

Reusable UI components for the ChessArena platform with TypeScript support and dark mode.

## Components

### Button
```tsx
import { Button } from '@/components/ui';

<Button variant="primary" size="md" onClick={handleClick}>
  Click me
</Button>
```

### Input
```tsx
import { Input } from '@/components/ui';

<Input
  label="Email"
  type="email"
  placeholder="Enter your email"
  error={errors.email}
/>
```

### Select
```tsx
import { Select } from '@/components/ui';

<Select
  label="Time Control"
  options={[
    { value: 'bullet', label: 'Bullet' },
    { value: 'blitz', label: 'Blitz' },
  ]}
/>
```

### Modal
```tsx
import { Modal } from '@/components/ui';

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirm Action"
  size="md"
>
  <p>Are you sure?</p>
</Modal>
```

### Badge
```tsx
import { Badge } from '@/components/ui';

<Badge variant="success" size="md">Active</Badge>
```

### Avatar
```tsx
import { Avatar } from '@/components/ui';

<Avatar
  src="/avatar.jpg"
  alt="User Name"
  fallback="UN"
  size="md"
/>
```

### Tabs
```tsx
import { Tabs } from '@/components/ui';

<Tabs
  tabs={[
    { id: 'tab1', label: 'Tab 1', content: <div>Content 1</div> },
    { id: 'tab2', label: 'Tab 2', content: <div>Content 2</div> },
  ]}
/>
```

### Dropdown
```tsx
import { Dropdown } from '@/components/ui';

<Dropdown
  trigger={<button>Menu</button>}
  items={[
    { id: '1', label: 'Edit', onClick: handleEdit },
    { id: '2', label: 'Delete', onClick: handleDelete },
  ]}
/>
```

### Toast
```tsx
import { Toast } from '@/components/ui';

<Toast
  message="Success!"
  type="success"
  onClose={() => {}}
/>
```

### Spinner
```tsx
import { Spinner } from '@/components/ui';

<Spinner size="md" color="primary" />
```

### Skeleton
```tsx
import { Skeleton, SkeletonCard } from '@/components/ui';

<Skeleton variant="text" width="100%" />
<SkeletonCard />
```

## Features

- ✅ TypeScript support with proper types
- ✅ Dark mode support
- ✅ Responsive design
- ✅ Accessibility (ARIA labels, keyboard navigation)
- ✅ Smooth animations (60fps)
- ✅ Consistent styling with Tailwind CSS

## Requirements Satisfied

- **22.5**: Smooth animations with 60 FPS for UI transitions
- **22.6**: Loading skeleton screens while content is loading
- **22.9**: Toast notifications for temporary status messages
