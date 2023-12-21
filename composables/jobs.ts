import { useState } from '#app';

export const useJobs = () => useState<any[]>('jobs', () => []);
export const useJob = () => useState<any>('job', () => null);
export const useJobMaxSalary = () => useState<any>('jobMaxSalary', () => 10000);

export async function getJob(id: string) {
  try {
    const response = await GET(`/jobs/jobs/${id}`);

    const job = useJob();
    job.value = response ?? null;

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function getJobs() {
  try {
    const response = await GET('/jobs/jobs');

    const jobs = useJobs();
    jobs.value = response ?? [];

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function getJobMaxSalary() {
  try {
    const response: any[] = await GET('/jobs/jobs');

    const jobMaxSalary = useJobMaxSalary();

    if (!!!response || response.length <= 0) {
      jobMaxSalary.value = 10000;
    } else {
      jobMaxSalary.value = Math.max(...response.map((job) => job.salary.max));
    }
    return [jobMaxSalary.value, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function getFilteredJobs(filters: any[]) {
  try {
    let query = '';

    for (let key in filters) {
      if (typeof filters[key] == 'object' && filters[key].length > 0) {
        filters[key].forEach((item: any) => {
          query = query + `${key}=${item}&`;
        });
      } else if (typeof filters[key] == 'boolean' && filters[key] == true) {
        query = query + `${key}=${filters[key]}&`;
      } else if (
        typeof filters[key] == 'string' &&
				!!filters[key] &&
				filters[key] != '---'
      ) {
        query = query + `${key}=${filters[key]}&`;
      } else if (typeof filters[key] == 'number' && filters[key] != -1) {
        query = query + `${key}=${filters[key]}&`;
      }
    }

    const response = await GET(`/jobs/jobs?${query}`);

    const jobs = useJobs();
    jobs.value = response ?? [];

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}
