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

  return mapped.slice(0, 20);
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

  return mapped.slice(0, 20);
}

export async function get_all_upcoming_assignments(token: string, existingCourses?: any[], courseFilter?: string) {
  let courses = existingCourses || await get_active_courses(token);

  if (courseFilter) {
    const filter = courseFilter.toLowerCase();
    // Use a broader search for course specific fragments
    courses = courses.filter((c: any) =>
      c.name.toLowerCase().includes(filter) ||
      c.course_code?.toLowerCase().includes(filter) ||
      filter.includes(c.course_code?.toLowerCase() || '')
    );
  }

  // If we identify a specific course, fetch a bit more for it
  const perPage = courseFilter ? 40 : 15;

  const results = await Promise.allSettled(
    courses.map(async (course: any) => {
      try {
        const fetchPromise = fetchCanvas(
          `/api/v1/courses/${course.id}/assignments?bucket=upcoming&per_page=${perPage}`,
          token
        );
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 5000));

        const data: any = await Promise.race([fetchPromise, timeoutPromise]);

        if (!Array.isArray(data)) return [];
        return data.map((a: any) => ({
          course: course.name,
          course_id: course.id,
          name: a.name,
          due_at: a.due_at,
          points_possible: a.points_possible,
          html_url: a.html_url,
        }));
      } catch (err) {
        console.warn(`[CANVAS FETCH ERROR] Course ${course.id}: ${err}`);
        return [];
      }
    })
  );

  const all = results
    .filter((r) => r.status === 'fulfilled')
    .flatMap((r: any) => r.value)
    .filter((a: any) => a.due_at)
    .sort((a: any, b: any) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime());

  return all.slice(0, 100);
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

export async function get_all_grades(token: string) {
  try {
    // 1. Fetch courses with a broader scope to include potentially completed ones if needed
    // Using simple 'active' state first, but fetching more to allow for filtering
    const courses = await fetchCanvas('/api/v1/courses?per_page=100', token);
    if (!Array.isArray(courses)) return [];

    // 2. Identify all potentially relevant courses
    // Instead of hard-exclucing Fall, we just lower its priority unless specifically matched
    const sortedCourses = courses
      .map((c: any) => {
        const name = c.name?.toLowerCase() || '';
        let priority = 0;
        if (name.includes('spring 2026') || name.includes('spr 26')) priority = 10;
        else if (name.includes('fall 2025') || name.includes('fa 25')) priority = 5;
        else if (c.enrollment_state === 'active') priority = 7;
        return { ...c, priority };
      })
      .filter(c => c.priority > 0)
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 15); // Limit to top 15 relevant courses

    // 3. Parallel fetch with short timeouts
    const results = await Promise.allSettled(
      sortedCourses.map(async (course: any) => {
        const fetchPromise = fetchCanvas(`/api/v1/courses/${course.id}?include[]=total_scores`, token);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 4000));
        return Promise.race([fetchPromise, timeoutPromise]);
      })
    );

    return results
      .filter(r => r.status === 'fulfilled')
      .map((r: any) => {
        const c = r.value;
        const enrollments = c.enrollments || [];
        return {
          course_name: c.name,
          course_code: c.course_code,
          course_id: c.id,
          grade: enrollments[0]?.computed_current_grade || 'N/A',
          score: enrollments[0]?.computed_current_score || 'N/A',
        };
      });
  } catch (err) {
    console.error('[CANVAS] get_all_grades failed:', err);
    return [];
  }
}
