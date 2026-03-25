const DEFAULT_DOMAIN = process.env.CANVAS_DOMAIN || 'https://canvas.instructure.com';

export async function fetchCanvas(endpoint: string, token: string, domain: string = DEFAULT_DOMAIN) {
  const url = `${domain}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    throw new Error('401_UNAUTHORIZED');
  }

  if (!response.ok) {
    throw new Error(`Canvas API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function get_active_courses(token: string) {
  const data = await fetchCanvas('/api/v1/courses?enrollment_state=active', token);
  if (!Array.isArray(data)) return [];

  const mapped = data.map((c: any) => ({
    id: c.id,
    name: c.name,
    course_code: c.course_code,
  })).filter(c => c.id && c.name);

  return mapped.slice(0, 10);
}

export async function get_current_grades(token: string, course_id: string) {
  const data = await fetchCanvas(`/api/v1/courses/${course_id}?include[]=total_scores`, token);

  const enrollments = data.enrollments || [];
  const currentGrade = enrollments[0]?.computed_current_grade || 'N/A';
  const currentScore = enrollments[0]?.computed_current_score || 'N/A';

  return {
    course_name: data.name,
    computed_current_score: currentScore,
    computed_current_grade: currentGrade,
  };
}

export async function get_upcoming_assignments(token: string, course_id: string) {
  const data = await fetchCanvas(`/api/v1/courses/${course_id}/assignments?bucket=upcoming&per_page=5`, token);
  if (!Array.isArray(data)) return [];

  const mapped = data.map((a: any) => ({
    id: a.id,
    name: a.name,
    due_at: a.due_at,
    points_possible: a.points_possible,
    html_url: a.html_url,
  }));

  return mapped.slice(0, 10);
}

/**
 * Fetches assignments across ALL active courses in parallel.
 * Returns a flat list sorted by due date, limited to the next 30 upcoming items.
 */
export async function get_all_upcoming_assignments(token: string, existingCourses?: any[]) {
  const courses = existingCourses || await get_active_courses(token);

  const results = await Promise.allSettled(
    courses.map(async (course: any) => {
      try {
        const data = await fetchCanvas(
          `/api/v1/courses/${course.id}/assignments?bucket=upcoming&per_page=10`,
          token
        );
        if (!Array.isArray(data)) return [];
        return data.map((a: any) => ({
          course: course.name,
          name: a.name,
          due_at: a.due_at,
          points_possible: a.points_possible,
          html_url: a.html_url,
        }));
      } catch {
        return [];
      }
    })
  );

  const all = results
    .filter((r) => r.status === 'fulfilled')
    .flatMap((r: any) => r.value)
    .filter((a: any) => a.due_at)
    .sort((a: any, b: any) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime());

  return all.slice(0, 30);
}

export async function get_user_profile(canvasKey: string) {
  const url = `https://psu.instructure.com/api/v1/users/self`;
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${canvasKey}` }
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('401_UNAUTHORIZED');
    throw new Error(`${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function get_assignment_details(token: string, course_id: string, assignment_id: string) {
  const data = await fetchCanvas(`/api/v1/courses/${course_id}/assignments/${assignment_id}`, token);

  return {
    id: data.id,
    name: data.name,
    description: data.description, // HTML content
    due_at: data.due_at,
    points_possible: data.points_possible,
    html_url: data.html_url,
    allowed_extensions: data.allowed_extensions,
    is_quiz: data.is_quiz_assignment,
  };
}
