import { useState } from "react";
import {
  Paper,
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Stack,
  Divider,
} from "@mui/material";
import { FirestoreUser } from "@/types/firebase";

interface UserProfileFormProps {
  userData: FirestoreUser;
  onSave: (data: Partial<FirestoreUser>) => Promise<void>;
}

export default function UserProfileForm({
  userData,
  onSave,
}: UserProfileFormProps) {
  // Set up state for form fields
  const [name, setName] = useState(userData.name || "");
  const [bio, setBio] = useState(userData.bio || "");
  const [photoURL, setPhotoURL] = useState(userData.photoURL || "");

  // State for form handling
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      // Create update data (only changed fields)
      const updateData: Partial<FirestoreUser> = {};

      if (name !== userData.name) updateData.name = name;
      if (bio !== userData.bio) updateData.bio = bio;
      if (photoURL !== userData.photoURL) updateData.photoURL = photoURL;

      // Skip if no changes
      if (Object.keys(updateData).length === 0) {
        setSuccess(true);
        setIsSubmitting(false);
        return;
      }

      // Save data
      await onSave(updateData);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
      console.error("Error updating profile:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Paper sx={{ p: 3, maxWidth: "800px", mx: "auto" }}>
      <Typography variant="h5" component="h1" gutterBottom>
        Your Profile
      </Typography>

      <Divider sx={{ mb: 3 }} />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Profile updated successfully!
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Stack spacing={3}>
          <TextField
            label="Display Name"
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <TextField
            label="Profile Image URL"
            fullWidth
            value={photoURL}
            onChange={(e) => setPhotoURL(e.target.value)}
            helperText="Enter a URL for your profile image"
          />

          <TextField
            label="Bio"
            fullWidth
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            multiline
            rows={4}
            helperText="Tell us about yourself"
          />

          <Box>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </Box>
        </Stack>
      </Box>

      {userData.photoURL && (
        <Box mt={4} textAlign="center">
          <Typography variant="subtitle2" gutterBottom>
            Current Profile Image
          </Typography>
          <Box
            component="img"
            src={userData.photoURL}
            alt={userData.name}
            sx={{
              maxWidth: "200px",
              maxHeight: "200px",
              borderRadius: "50%",
              objectFit: "cover",
            }}
            onError={(e) => {
              // Set a default image if the URL fails to load
              (e.target as HTMLImageElement).src = "/default-profile.png";
            }}
          />
        </Box>
      )}
    </Paper>
  );
}
