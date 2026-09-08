-- A separate database for the integration suite.
--
-- The tests TRUNCATE app_user, course and everything else in their teardown.
-- Pointed at the development database, running `pytest` silently wipes the
-- data you were working with — which is exactly what happened once before this
-- file existed.
CREATE DATABASE ilia_test;
