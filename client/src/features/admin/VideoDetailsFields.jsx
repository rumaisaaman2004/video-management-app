import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import { FormField } from '../../components/ui/FormField.jsx';

const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public: anyone can watch' },
  { value: 'private', label: 'Private: only admins' },
];

/** Title, description, category, visibility and tags; shared by the upload and edit forms. */
export function VideoDetailsFields({ values, errors, categories, onChange, disabled = false }) {
  const categoryOptions = [
    { value: '', label: 'No category' },
    ...categories.map((category) => ({ value: category.id, label: category.name })),
  ];

  return (
    <fieldset disabled={disabled}>
      <FormField
        label="Title"
        name="title"
        required
        maxLength={200}
        value={values.title}
        onChange={onChange}
        error={errors.title}
      />
      <FormField
        label="Description"
        name="description"
        as="textarea"
        rows={4}
        maxLength={5000}
        value={values.description}
        onChange={onChange}
        error={errors.description}
      />
      <Row className="g-3">
        <Col md={6}>
          <FormField
            label="Category"
            name="categoryId"
            as="select"
            options={categoryOptions}
            value={values.categoryId}
            onChange={onChange}
            error={errors.categoryId}
          />
        </Col>
        <Col md={6}>
          <FormField
            label="Visibility"
            name="visibility"
            as="select"
            options={VISIBILITY_OPTIONS}
            value={values.visibility}
            onChange={onChange}
            error={errors.visibility}
          />
        </Col>
      </Row>
      <FormField
        label="Tags"
        name="tags"
        placeholder="react, hooks, beginner"
        help="Separate tags with commas. Up to 10."
        value={values.tags}
        onChange={onChange}
        error={errors.tags}
      />
    </fieldset>
  );
}
