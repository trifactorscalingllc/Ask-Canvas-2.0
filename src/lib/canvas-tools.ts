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
async function fetchCanvasGraphQL(query: string, token: string) {
  const baseUrl = process.env.CANVAS_DOMAIN?.startsWith('http')
    ? process.env.CANVAS_DOMAIN
    : `https://${process.env.CANVAS_DOMAIN || 'canvas.instructure.com'}`;

  const response = await fetch(`${baseUrl}/api/graphql`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Canvas GraphQL Error: ${response.status} - ${err}`);
  }

  return response.json();
}

// This second fetchCanvas function appears to be a duplicate or an older version.
// Assuming the first one (exported) is the intended primary one, and this one
// should be removed or was intended to be replaced. For this edit, I will
// keep it as is, but note the redundancy.

export async function get_dashboard_courses(token: string) {
  // dashboard_cards returns exactly what the user sees on their home screen
  const data = await fetchCanvas('/api/v1/dashboard/dashboard_cards', token);
  if (!Array.isArray(data)) return [];
  return data.map((c: any) => ({
    id: c.id,
    name: c.shortName || c.originalName,
    course_code: c.courseCode,
  })).filter(c => c.id && c.name);
}

export async function get_active_courses(token: string) {
  // Robust Discovery: Combine dashboard cards + standard courses
  const [dash, courses] = await Promise.all([
    get_dashboard_courses(token),
    fetchCanvas('/api/v1/courses?include[]=term&per_page=100', token)
  ]);

  const all = Array.isArray(courses) ? [...dash, ...courses] : dash;

  // Deduplicate by ID
  const map = new Map();
  all.forEach((c: any) => {
    if (c.id && !map.has(c.id)) {
      map.set(c.id, {
        id: c.id,
        name: c.name || c.shortName || c.course_code || 'Unnamed Course',
        course_code: c.course_code,
        term: c.term,
      });
    }
  });

  return Array.from(map.values()).filter(c => c.name !== 'Unnamed Course');
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
  const now = new Date();
  const threeWeeksOut = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);
  const map = new Map(); // CourseID -> Course details
  let allAssignments: any[] = [];
  let scannedCourseNames: string[] = [];
  let hasMoreBeyondThreeWeeks = false;

  try {
    // PHASE 8.1: ROBUST GRAPHQL DEEP SYNC (Combined Entry Points)
    const gqlQuery = `
      query allAssignments {
        allCourses {
          id
          name
          courseCode
          term { name endAt }
          assignmentsConnection {
            nodes { id name dueAt pointsPossible htmlUrl gradedAt workflowState }
          }
        }
        courseEnrollments {
          course {
            id
            name
            courseCode
            term { name endAt }
            assignmentsConnection {
              nodes { id name dueAt pointsPossible htmlUrl gradedAt workflowState }
            }
          }
        }
      }
    `;

    const result = await fetchCanvasGraphQL(gqlQuery, token);
    const gqlAllCourses = result?.data?.allCourses;
    const gqlEnrollments = result?.data?.courseEnrollments;

    // Helper to process a course object
    const processCourse = (course: any) => {
      if (!course || !course.id || map.has(course.id)) return;
      map.set(course.id, course);
      scannedCourseNames.push(course.name || course.courseCode);

      const assignments = course.assignmentsConnection?.nodes;
      if (Array.isArray(assignments)) {
        assignments.forEach((a: any) => {
          allAssignments.push({
            course: course.name,
            course_id: course.id,
            semester: course.term?.name || 'Unknown',
            term_end: course.term?.endAt,
            name: a.name,
            due_at: a.dueAt,
            points_possible: a.pointsPossible,
            html_url: a.htmlUrl,
            is_graded: !!a.gradedAt || a.workflowState === 'graded'
          });
        });
      }
    };

    if (Array.isArray(gqlAllCourses)) gqlAllCourses.forEach(processCourse);
    if (Array.isArray(gqlEnrollments)) gqlEnrollments.forEach((e: any) => processCourse(e.course));

  } catch (err) {
    console.warn(`[GRAPHQL ERROR] Falling back to REST: ${err}`);
    // FALLBACK TO STAGE 7 REST LOGIC (Legacy Safety Net)
    const courses = existingCourses || await get_active_courses(token);
    const restResult = await legacy_get_all_upcoming_assignments(token, courses);
    return restResult;
  }

  // FIDELITY & PERFORMANCE: Same filtering as Stage 7
  const upcoming = allAssignments.filter((a: any) => {
    if (a.is_graded) return false;
    if (!a.due_at) return true;
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

  const scanSummary = `[GRAPHQL DEEP SYNC] Scanned ${scannedCourseNames.length} courses: [${scannedCourseNames.join(', ')}]. Total un-graded items found: ${allAssignments.length}.`;

  return {
    assignments: sorted.slice(0, 50),
    hasMore: hasMoreBeyondThreeWeeks,
    scan_trace: scanSummary,
    meta: {
      total_found: allAssignments.length,
      filtered_upcoming: sorted.length,
      window_days: 21,
      method: "graphql"
    }
  };
}

// Rename the old logic to use as a fallback
async function legacy_get_all_upcoming_assignments(token: string, courses: any[]) {
  const now = new Date();
  const threeWeeksOut = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);
  const perPage = 100;

  // SCALING: Concurrency control
  const batchSize = 5;
  let allAssignments: any[] = [];
  let hasMoreBeyondThreeWeeks = false;

  // 1. Parallel Safety Net: Hit the Global Users endpoint while scanning individual courses
  const globalSafetyPromise = fetchCanvas(`/api/v1/users/self/upcoming_assignments?per_page=100`, token).catch(() => []);

  // 2. Individual Scan Phase
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

  // 3. Merge Global Safety Data
  const globalData: any = await globalSafetyPromise;
  if (Array.isArray(globalData)) {
    globalData.forEach((ga: any) => {
      // If we missed this assignment ID in our per-course scan, add it.
      if (!allAssignments.some(a => a.name === ga.name && a.course_id === ga.course_id)) {
        allAssignments.push({
          course: ga.context_name || 'Global',
          course_id: ga.course_id,
          name: ga.name,
          due_at: ga.due_at,
          points_possible: ga.points_possible,
          html_url: ga.html_url,
          is_graded: false // Upcoming endpoint only returns uncompleted items
        });
      }
    });
  }

  const upcoming = allAssignments.filter((a: any) => {
    if (a.is_graded) return false;
    if (!a.due_at) return true;
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

  // SCAN SUMMARY TRACE: For total visibility
  const scanSummary = `Scanned ${courses.length} courses: [${courses.map(c => c.name).join(', ')}]. Total un-graded items found: ${allAssignments.length}.`;

  return {
    assignments: sorted.slice(0, 50),
    hasMore: hasMoreBeyondThreeWeeks,
    scan_trace: scanSummary,
    meta: {
      total_found: allAssignments.length,
      filtered_upcoming: sorted.length,
      window_days: 21,
      method: "rest-fallback"
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
