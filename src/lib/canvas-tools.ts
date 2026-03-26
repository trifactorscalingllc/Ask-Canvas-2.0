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
  // Removing enrollment_state=active to ensure we see all courses the student is involved in.
  // We'll filter for valid courses (with names) in-code.
  const data = await fetchCanvas('/api/v1/courses?include[]=term&per_page=100', token);
  if (!Array.isArray(data)) return [];

  const mapped = data.map((c: any) => ({
    id: c.id,
    name: c.name || c.course_code, // Fallback to course_code if name is blank
    course_code: c.course_code,
    term: c.term, // name, start_at, end_at
  })).filter(c => c.id && c.name);

  return mapped;
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
    courses = courses.filter((c: any) =>
      c.name.toLowerCase().includes(filter) ||
      c.course_code?.toLowerCase().includes(filter) ||
      filter.includes(c.course_code?.toLowerCase() || '')
    );
  }

  const now = new Date();
  const threeWeeksOut = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);
  const perPage = 100;

  // SCALING: Process courses in batches of 5 to prevent Vercel timeout/congestion
  const batchSize = 5;
  let allAssignments: any[] = [];
  let hasMoreBeyondThreeWeeks = false;

  for (let i = 0; i < courses.length; i += batchSize) {
    const batch = courses.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(async (course: any) => {
        try {
          const data: any = await fetchCanvas(
            `/api/v1/courses/${course.id}/assignments?per_page=${perPage}&order_by=due_at`,
            token
          );
          if (!Array.isArray(data)) return [];

          return data.map((a: any) => ({
            course: course.name,
            course_id: course.id,
            semester: course.term?.name || 'Unknown',
            term_end: course.term?.end_at,
            name: a.name,
            due_at: a.due_at,
            points_possible: a.points_possible,
            html_url: a.html_url,
            is_graded: !!a.graded_at || !!a.submission?.graded_at || a.workflow_state === 'graded',
          }));
        } catch (err) {
          console.warn(`[CANVAS FETCH ERROR] Course ${course.id}: ${err}`);
          return [];
        }
      })
    );

    const batchFlat = results
      .filter((r) => r.status === 'fulfilled')
      .flatMap((r: any) => r.value);

    allAssignments = [...allAssignments, ...batchFlat];
  }

  // FIDELITY & PERFORMANCE: 
  // 1. Separate items by the 3-week window
  // 2. Return the upcoming ones, and set the 'hasMore' flag for the AI
  const upcoming = allAssignments.filter((a: any) => {
    if (a.is_graded) return false;
    if (!a.due_at) return true; // Keep undated items
    const dueDate = new Date(a.due_at);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const isUpcoming = dueDate > oneDayAgo && dueDate < threeWeeksOut;
    if (dueDate >= threeWeeksOut) hasMoreBeyondThreeWeeks = true;
    return isUpcoming;
  });

  const sorted = upcoming.sort((a: any, b: any) => {
    if (!a.due_at) return 1;
    if (!b.due_at) return -1;
    return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
  });

  return {
    assignments: sorted.slice(0, 50),
    hasMore: hasMoreBeyondThreeWeeks,
    meta: {
      total_found: allAssignments.length,
      filtered_upcoming: sorted.length,
      window_days: 21
    }
  };
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
    // 1. Fetch courses with Term metadata
    const courses = await fetchCanvas('/api/v1/courses?per_page=100&include[]=term', token);
    if (!Array.isArray(courses)) return [];

    // 2. Chronological Sorting using actual Canvas Term Metadata
    // This allows the AI to "just know" which classes are current (ending in June 2026 vs Finished)
    const sortedCourses = courses
      .filter(c => c.id && c.name && c.term)
      .sort((a, b) => {
        const dateA = a.term?.end_at ? new Date(a.term.end_at).getTime() : 0;
        const dateB = b.term?.end_at ? new Date(b.term.end_at).getTime() : 0;
        return dateB - dateA; // Most recent/future terms first
      })
      .slice(0, 20); // Process top 20 relevant courses

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
          semester: c.term?.name || 'Unknown',
          term_end: c.term?.end_at,
          grade: enrollments[0]?.computed_current_grade || 'N/A',
          score: enrollments[0]?.computed_current_score || 'N/A',
        };
      });
  } catch (err) {
    console.error('[CANVAS] get_all_grades failed:', err);
    return [];
  }
}
