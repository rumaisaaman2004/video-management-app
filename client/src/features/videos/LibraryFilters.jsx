import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import { FormField } from '../../components/ui/FormField.jsx';
import { SearchBox } from '../../components/ui/SearchBox.jsx';

const MAX_TAG_CHIPS = 12;

/** Tags worth offering as quick filters: the most used ones, plus the active tag. */
function tagChips(tags, activeTag) {
  const popular = tags.filter((tag) => tag.videoCount > 0).slice(0, MAX_TAG_CHIPS);
  const names = popular.map((tag) => tag.name);
  return activeTag && !names.includes(activeTag) ? [activeTag, ...names] : names;
}

/** Search box, category and sort menus, and popular-tag chips for the library. */
export function LibraryFilters({ params, sortOptions, categories, tags, onChange }) {
  const categoryOptions = [
    { value: '', label: 'All categories' },
    ...categories.map((category) => ({
      value: category.slug,
      label: `${category.name} (${category.videoCount})`,
    })),
  ];
  const chips = tagChips(tags, params.tag);

  return (
    <div className="d-grid gap-3 mb-4">
      <Row className="g-3 align-items-end">
        <Col xs={12} lg>
          <SearchBox
            value={params.q}
            placeholder="Search by title, description or tag"
            onSearch={(q) => onChange({ q }, { replace: true })}
          />
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <FormField
            label="Category"
            as="select"
            className="mb-0"
            value={params.category}
            options={categoryOptions}
            onChange={(event) => onChange({ category: event.target.value })}
          />
        </Col>
        <Col xs={12} sm={6} lg={2}>
          <FormField
            label="Sort by"
            as="select"
            className="mb-0"
            value={params.sort}
            options={sortOptions}
            onChange={(event) => onChange({ sort: event.target.value })}
          />
        </Col>
      </Row>

      {chips.length > 0 && (
        <div
          className="d-flex flex-wrap align-items-center gap-2"
          role="group"
          aria-label="Filter by tag"
        >
          <span className="small text-body-secondary me-1">Tags:</span>
          {chips.map((name) => {
            const isActive = params.tag === name;
            return (
              <Button
                key={name}
                size="sm"
                variant={isActive ? 'primary' : 'outline-secondary'}
                className="rounded-pill"
                aria-pressed={isActive}
                onClick={() => onChange({ tag: isActive ? '' : name })}
              >
                #{name}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}
