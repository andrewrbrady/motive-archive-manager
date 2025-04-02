import { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Button,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  SelectChangeEvent,
  Chip,
  Stack,
  Alert,
  CircularProgress,
} from "@mui/material";
import { UserWithAuth } from "@/lib/firestore/users";

interface UserRolesEditorProps {
  user: UserWithAuth;
  onSave: (updatedData: {
    roles: string[];
    creativeRoles: string[];
    status: string;
  }) => Promise<void>;
}

const AVAILABLE_ROLES = ["user", "admin", "editor"];
const AVAILABLE_CREATIVE_ROLES = [
  "video_editor",
  "photographer",
  "content_writer",
  "social_media_manager",
  "cinematographer",
  "sound_engineer",
  "graphic_designer",
  "storyboard_artist",
  "detailer",
  "writer",
  "marketing",
  "mechanic",
  "director",
  "producer",
];
const USER_STATUSES = ["active", "inactive", "suspended"];

export default function UserRolesEditor({
  user,
  onSave,
}: UserRolesEditorProps) {
  const [roles, setRoles] = useState<string[]>(user.roles || []);
  const [creativeRoles, setCreativeRoles] = useState<string[]>(
    user.creativeRoles || []
  );
  const [status, setStatus] = useState<string>(user.status || "active");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  // Handle role checkbox changes
  const handleRoleChange =
    (role: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.checked) {
        setRoles([...roles, role]);
      } else {
        setRoles(roles.filter((r) => r !== role));
      }
    };

  // Handle creative role changes
  const handleCreativeRoleChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setCreativeRoles(typeof value === "string" ? value.split(",") : value);
  };

  // Handle status change
  const handleStatusChange = (event: SelectChangeEvent) => {
    setStatus(event.target.value);
  };

  // Save user roles
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      // Ensure user always has at least "user" role
      const rolesList = roles.length > 0 ? roles : ["user"];

      await onSave({
        roles: rolesList,
        creativeRoles,
        status,
      });

      setSuccess(true);
    } catch (error) {
      console.error("Error updating user roles:", error);
      setError(
        error instanceof Error ? error.message : "Failed to update user roles"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" gutterBottom>
          User Roles & Permissions
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            User roles updated successfully!
          </Alert>
        )}

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            System Roles
          </Typography>
          <FormGroup row>
            {AVAILABLE_ROLES.map((role) => (
              <FormControlLabel
                key={role}
                control={
                  <Checkbox
                    checked={roles.includes(role)}
                    onChange={handleRoleChange(role)}
                    name={role}
                  />
                }
                label={role.charAt(0).toUpperCase() + role.slice(1)}
              />
            ))}
          </FormGroup>
        </Box>

        <Box sx={{ mb: 3 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="creative-roles-label">Creative Roles</InputLabel>
            <Select
              labelId="creative-roles-label"
              id="creative-roles"
              multiple
              value={creativeRoles}
              onChange={handleCreativeRoleChange}
              renderValue={(selected) => (
                <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                  {selected.map((value) => (
                    <Chip
                      key={value}
                      label={value.replace("_", " ")}
                      size="small"
                    />
                  ))}
                </Stack>
              )}
            >
              {AVAILABLE_CREATIVE_ROLES.map((role) => (
                <MenuItem key={role} value={role}>
                  {role.replace("_", " ")}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ mb: 3 }}>
          <FormControl fullWidth>
            <InputLabel id="status-label">Account Status</InputLabel>
            <Select
              labelId="status-label"
              id="status"
              value={status}
              label="Account Status"
              onChange={handleStatusChange}
            >
              {USER_STATUSES.map((statusOption) => (
                <MenuItem key={statusOption} value={statusOption}>
                  {statusOption.charAt(0).toUpperCase() + statusOption.slice(1)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Button
          variant="contained"
          color="primary"
          onClick={handleSubmit}
          disabled={isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
        >
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </CardContent>
    </Card>
  );
}
